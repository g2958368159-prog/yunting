import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import type { Task } from '../types';

interface DataBackupProps {
  tasks: Task[];
  onImport: (tasks: Task[]) => void;
}

export function DataBackup({ tasks, onImport }: DataBackupProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `todo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedTasks = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedTasks)) {
          if (confirm('导入将覆盖当前所有数据，是否继续？')) {
            onImport(importedTasks);
          }
        } else {
          alert('数据格式不正确');
        }
      } catch (err) {
        alert('读取文件失败');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex gap-2">
      <button 
        onClick={handleExport}
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md bg-surface text-tertiary hover:text-primary transition-colors text-xs font-medium shadow-sm border border-transparent hover:border-surface-hover"
      >
        <Download size={14} /> 导出备份
      </button>
      
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md bg-surface text-tertiary hover:text-primary transition-colors text-xs font-medium shadow-sm border border-transparent hover:border-surface-hover"
      >
        <Upload size={14} /> 导入数据
      </button>
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
}
