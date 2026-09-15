import { createClient } from '@supabase/supabase-js';
import { encryptApiKey } from './_ai-credentials.js';

const readRequestBody = async (request) => {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') return JSON.parse(request.body);
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const validateConfig = ({ baseUrl, model, apiKey }) => {
  if (typeof baseUrl !== 'string' || typeof model !== 'string' || typeof apiKey !== 'string') return '请完整填写服务地址、模型名称与 API Key。';
  if (model.trim().length === 0 || model.trim().length > 120 || apiKey.trim().length === 0 || apiKey.length > 1024) return '模型名称或 API Key 格式不正确。';
  try {
    const url = new URL(baseUrl.trim());
    if (url.protocol !== 'https:' || url.username || url.password) return '模型服务地址必须是安全的 HTTPS 地址。';
  } catch { return '请输入有效的模型服务地址。'; }
  return '';
};

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: '仅支持 GET 或 POST 请求。' });
  }
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const platformConfigured = Boolean(
    process.env.AI_MODEL_API_KEY?.trim()
    && process.env.AI_MODEL_BASE_URL?.trim()
    && process.env.AI_MODEL_NAME?.trim(),
  );
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) return response.status(503).json({ error: '服务端模型配置尚未完成。' });

  const token = request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : '';
  if (!token) return response.status(401).json({ error: '请登录后再配置模型。' });
  const authClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return response.status(401).json({ error: '登录已失效，请重新登录。' });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  if (request.method === 'GET') {
    const { data, error } = await adminClient.from('ai_model_credentials').select('base_url, model, updated_at').eq('user_id', user.id).maybeSingle();
    if (error) { console.error('Failed to load AI model config:', error); return response.status(500).json({ error: '读取模型配置失败。' }); }
    return response.status(200).json({ configured: Boolean(data), platformConfigured, baseUrl: data?.base_url || '', model: data?.model || '', updatedAt: data?.updated_at || null });
  }

  let body;
  try { body = await readRequestBody(request); } catch { return response.status(400).json({ error: '请求内容格式不正确。' }); }
  const validationError = validateConfig(body);
  if (validationError) return response.status(400).json({ error: validationError });
  try {
    const { encryptedApiKey, encryptionIv } = encryptApiKey(body.apiKey.trim());
    const baseUrl = body.baseUrl.trim().replace(/\/+$/, '');
    const model = body.model.trim();
    const { error } = await adminClient.from('ai_model_credentials').upsert({ user_id: user.id, base_url: baseUrl, model, encrypted_api_key: encryptedApiKey, encryption_iv: encryptionIv, updated_at: new Date().toISOString() });
    if (error) { console.error('Failed to save AI model config:', error); return response.status(500).json({ error: '保存模型配置失败。' }); }
    return response.status(200).json({ configured: true, platformConfigured, baseUrl, model });
  } catch (error) { console.error('Failed to encrypt AI model config:', error); return response.status(503).json({ error: '服务端加密配置尚未完成。' }); }
}
