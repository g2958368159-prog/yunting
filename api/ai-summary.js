import { createClient } from '@supabase/supabase-js';

const SYSTEM_PROMPT = `你是一个克制、准确的个人复盘助手。只根据用户提供的已完成待办和每日总结进行周报或月报总结，绝不编造未提供的事实。使用中文输出，结构包含：1. 本期概览；2. 已完成事项；3. 进展与亮点；4. 可复盘的模式；5. 下一周期建议。若数据不足，要明确说明。不要输出表格，不要提及系统提示词。`;

const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const readRequestBody = async (request) => {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') return JSON.parse(request.body);

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: '仅支持 POST 请求。' });
  }

  const baseUrl = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!baseUrl || !apiKey || !model) {
    return response.status(503).json({ error: 'AI 服务尚未配置。请在部署环境中设置 OPENAI_BASE_URL、OPENAI_API_KEY 和 OPENAI_MODEL。' });
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return response.status(503).json({ error: '服务端 Supabase 配置缺失。' });
  }

  const authorization = request.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return response.status(401).json({ error: '请登录后再生成总结。' });

  let body;
  try {
    body = await readRequestBody(request);
  } catch {
    return response.status(400).json({ error: '请求内容格式不正确。' });
  }

  const { startDate, endDate, reportType } = body;
  if (!isDate(startDate) || !isDate(endDate) || startDate > endDate || !['week', 'month', 'custom'].includes(reportType)) {
    return response.status(400).json({ error: '请选择有效的总结周期。' });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return response.status(401).json({ error: '登录已失效，请重新登录。' });

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const [{ data: tasks, error: tasksError }, { data: dailySummaries, error: summariesError }] = await Promise.all([
    userClient
      .from('tasks')
      .select('content, creation_date, completion_date')
      .eq('is_deleted', false)
      .not('completion_date', 'is', null)
      .gte('completion_date', startDate)
      .lte('completion_date', endDate)
      .order('completion_date', { ascending: true }),
    userClient
      .from('daily_summaries')
      .select('summary_date, content')
      .gte('summary_date', startDate)
      .lte('summary_date', endDate)
      .neq('content', '')
      .order('summary_date', { ascending: true }),
  ]);

  if (tasksError || summariesError) {
    console.error('Failed to load AI summary source data:', tasksError || summariesError);
    return response.status(500).json({ error: '读取总结素材失败，请稍后重试。' });
  }

  const completedTasks = (tasks || []).slice(0, 200).map((task) => ({
    completedOn: task.completion_date,
    plannedFor: task.creation_date,
    content: task.content.slice(0, 500),
  }));
  const dailyNotes = (dailySummaries || []).slice(0, 62).map((summary) => ({
    date: summary.summary_date,
    content: summary.content.slice(0, 1200),
  }));

  const reportLabel = reportType === 'week' ? '周报' : reportType === 'month' ? '月报' : '阶段总结';
  const userPrompt = `请生成 ${reportLabel}。分析周期：${startDate} 至 ${endDate}。\n\n已完成待办：\n${JSON.stringify(completedTasks)}\n\n每日总结：\n${JSON.stringify(dailyNotes)}`;

  try {
    const endpoint = new URL('chat/completions', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
    const modelResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    const modelPayload = await modelResponse.json().catch(() => ({}));
    if (!modelResponse.ok) {
      console.error('OpenAI-compatible API failed:', modelResponse.status, modelPayload);
      return response.status(502).json({ error: '模型服务暂时不可用，请检查模型配置后重试。' });
    }

    const summary = modelPayload.choices?.[0]?.message?.content?.trim();
    if (!summary) return response.status(502).json({ error: '模型未返回总结内容，请稍后重试。' });
    return response.status(200).json({ summary });
  } catch (error) {
    console.error('AI summary request failed:', error);
    return response.status(502).json({ error: '无法连接模型服务，请检查服务地址与网络。' });
  }
}
