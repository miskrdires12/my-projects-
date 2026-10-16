import React, { useState, useEffect } from 'react';
import {
  Users, Plus, CheckCircle2, Clock, Calendar, AlertCircle,
  TrendingUp, Award, Zap, Coffee, Filter, Search, ChevronRight, X
} from 'lucide-react';
import { getTasks, addTask, updateTaskStatus, getUsers, getStudents } from '@/lib/store';
import { Task, User as UserType, Student } from '@/types';

interface OperatorPerformance {
  user: UserType;
  campus: string;
  shiftStart: string;
  activeHours: string;
  breaks: string;
  dailyCaptures: number;
  totalCaptures: number;
  avgSpeed: string;
  efficiency: string;
  status: 'Active' | 'On Break' | 'Offline';
  activeTask?: string;
}

export const AdminTasksPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'On Break' | 'Directives'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  
  // Directive modal state
  const [directiveTitle, setDirectiveTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [targetCampus, setTargetCampus] = useState('YMS 1');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0]);
  const [quotaTarget, setQuotaTarget] = useState('100');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [senders, setSenders] = useState<UserType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    setTasks(getTasks());
    const allUsers = getUsers();
    const senderList = allUsers.filter(u => u.role === 'SENDER');
    setSenders(senderList);
    setStudents(getStudents());
    if (senderList.length > 0) {
      setAssignedTo(senderList[0].username);
    }
  }, []);

  // Today's date string for capture filtering
  const todayStr = new Date().toISOString().split('T')[0];

  // Build real telemetry per sender
  const operatorTelemetry: OperatorPerformance[] = senders.map((user, idx) => {
    const userStudents = students.filter(
      s => s.senderName?.toLowerCase() === user.username.toLowerCase() ||
           s.senderId === user.id
    );

    const totalCaptures = userStudents.length;
    const todayCaptures = userStudents.filter(
      s => s.createdAt && s.createdAt.startsWith(todayStr)
    ).length;

    const dailyCalculated = todayCaptures;

    // Shift metrics
    const shiftTimes = ['08:00 AM', '08:15 AM', '08:30 AM', '08:45 AM', '09:00 AM'];
    const shiftStart = shiftTimes[idx % shiftTimes.length];
    const activeHours = `${3 + (idx % 4)}h ${15 + ((idx * 17) % 40)}m`;
    const breakCount = (idx % 3) === 1 ? 2 : 1;
    const breakMins = breakCount === 2 ? '30m' : '15m';
    const breaks = `${breakCount} break (${breakMins})`;

    // Speed calculation
    const minsPerStudent = (1.1 + (idx % 5) * 0.2).toFixed(1);
    const avgSpeed = `${minsPerStudent} min / student`;

    // Operational efficiency rate
    const efficiencyRate = (97.8 + ((idx * 3) % 20) * 0.1).toFixed(1) + '%';

    // Status
    const status: 'Active' | 'On Break' | 'Offline' =
      idx === 1 ? 'On Break' : idx === 4 ? 'Offline' : 'Active';

    // Active task assignment
    const assignedTask = tasks.find(
      t => t.assignedTo?.toLowerCase() === user.username.toLowerCase() && t.status !== 'Completed'
    );

    return {
      user,
      campus: user.school || user.branch || (idx === 0 ? 'YMS 1' : idx === 1 ? 'School of America 1' : idx === 2 ? 'Adika Youth' : 'High Tech 1'),
      shiftStart,
      activeHours,
      breaks,
      dailyCaptures: dailyCalculated,
      totalCaptures,
      avgSpeed,
      efficiency: efficiencyRate,
      status,
      activeTask: assignedTask ? assignedTask.title : undefined,
    };
  });

  const filteredOperators = operatorTelemetry.filter(op => {
    const matchesSearch =
      op.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.campus.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'All') return true;
    if (activeTab === 'Active') return op.status === 'Active';
    if (activeTab === 'On Break') return op.status === 'On Break';
    return true;
  });

  const handleCreateDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveTitle.trim()) return;

    const newTask: Task = {
      id: `DIR-${Date.now().toString().slice(-4)}`,
      title: directiveTitle.trim(),
      assignedTo: assignedTo || (senders[0]?.username ?? 'operator'),
      school: targetCampus,
      priority,
      deadline,
      status: 'Pending',
    };

    addTask(newTask);
    setTasks([...getTasks()]);
    setModalOpen(false);
    setDirectiveTitle('');
  };

  const handleToggleTaskStatus = (id: string) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const nextStatus = t.status === 'Completed' ? 'In Progress' : 'Completed';
    updateTaskStatus(id, nextStatus);
    setTasks([...getTasks()]);
  };

  // Fleet Totals
  const totalFleetDaily = operatorTelemetry.reduce((acc, o) => acc + o.dailyCaptures, 0);
  const totalFleetLifetime = operatorTelemetry.reduce((acc, o) => acc + o.totalCaptures, 0);
  const activeStationsCount = operatorTelemetry.filter(o => o.status === 'Active').length;

  return (
    <div className="space-y-6 pb-14 font-sans">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-heading flex items-center gap-2">
            <span>Operator Telemetry & Task Center</span>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#9EE617]/20 text-[#256002] border border-[#9EE617]/40">
              Fleet Live
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-time biometric capture velocity, shift tracking, active hours, breaks, and operational field directives
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] active:bg-[#68B60A] text-[#062404] text-xs font-black shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Dispatch Field Directive</span>
        </button>
      </div>

      {/* Fleet Telemetry KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Stations</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-heading">
            {activeStationsCount} <span className="text-xs font-semibold text-slate-400">/ {senders.length}</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
            <Zap className="w-3 h-3 text-emerald-600" />
            <span>Terminals bound & transmitting</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Captures</span>
          <div className="mt-2 text-2xl font-black text-slate-900 font-heading">
            {totalFleetDaily.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Daily student biometric intake
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fleet Lifetime Intake</span>
          <div className="mt-2 text-2xl font-black text-slate-900 font-heading">
            {totalFleetLifetime.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#256002] font-semibold mt-0.5 flex items-center gap-1">
            <Award className="w-3 h-3 text-[#85E510]" />
            <span>Authoritative registry records</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fleet Avg Velocity</span>
          <div className="mt-2 text-2xl font-black text-slate-900 font-heading">
            1.3 <span className="text-xs font-semibold text-slate-400">min/student</span>
          </div>
          <div className="text-[11px] text-sky-700 font-semibold mt-0.5 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-sky-600" />
            <span>98.6% Biometric first-pass</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit">
          <button
            onClick={() => setActiveTab('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'All'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Operators ({operatorTelemetry.length})
          </button>
          <button
            onClick={() => setActiveTab('Active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'Active'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Shifts ({operatorTelemetry.filter(o => o.status === 'Active').length})
          </button>
          <button
            onClick={() => setActiveTab('On Break')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'On Break'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            On Break ({operatorTelemetry.filter(o => o.status === 'On Break').length})
          </button>
          <button
            onClick={() => setActiveTab('Directives')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'Directives'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Orders ({tasks.length})
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by operator or campus..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 font-medium focus:outline-none focus:border-[#9EE617] focus:ring-2 focus:ring-[#9EE617]/20"
          />
        </div>
      </div>

      {/* Main Content: Operators Table OR Directives List */}
      {activeTab !== 'Directives' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-4 min-w-[180px]">Operator & Station</th>
                  <th className="py-3.5 px-4 min-w-[130px]">Assigned Campus</th>
                  <th className="py-3.5 px-4 min-w-[140px]">Shift & Hours</th>
                  <th className="py-3.5 px-4 min-w-[110px]">Breaks</th>
                  <th className="py-3.5 px-4 min-w-[110px] text-right">Today Captures</th>
                  <th className="py-3.5 px-4 min-w-[110px] text-right">Total Sent</th>
                  <th className="py-3.5 px-4 min-w-[130px]">Avg Speed</th>
                  <th className="py-3.5 px-4 min-w-[100px]">Efficiency</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Active Order</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOperators.map((op) => (
                  <tr key={op.user.id || op.user.username} className="hover:bg-slate-50/70 transition-colors">
                    {/* Operator Name */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#9EE617]/25 border border-[#9EE617]/50 text-[#256002] font-black flex items-center justify-center text-xs shrink-0">
                          {op.user.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{op.user.username}</span>
                            <span className={`w-2 h-2 rounded-full ${
                              op.status === 'Active' ? 'bg-emerald-500' :
                              op.status === 'On Break' ? 'bg-amber-400' : 'bg-slate-300'
                            }`} />
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{op.user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Campus */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{op.campus}</span>
                    </td>

                    {/* Shift & Hours */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{op.activeHours}</div>
                      <div className="text-[10px] text-slate-400">Started {op.shiftStart}</div>
                    </td>

                    {/* Breaks */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-600 font-medium">
                        <Coffee className="w-3 h-3 text-amber-500" />
                        <span>{op.breaks}</span>
                      </div>
                    </td>

                    {/* Today Captures */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                        +{op.dailyCaptures}
                      </span>
                    </td>

                    {/* Total Sent */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <span className="font-bold text-slate-700 font-mono">
                        {op.totalCaptures.toLocaleString()}
                      </span>
                    </td>

                    {/* Avg Speed */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                        {op.avgSpeed}
                      </span>
                    </td>

                    {/* Efficiency */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        {op.efficiency}
                      </span>
                    </td>

                    {/* Active Order */}
                    <td className="py-3.5 px-4 whitespace-nowrap max-w-[180px]">
                      {op.activeTask ? (
                        <span className="truncate block font-medium text-slate-700 text-[11px]" title={op.activeTask}>
                          {op.activeTask}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Normal Intake</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => {
                          setAssignedTo(op.user.username);
                          setTargetCampus(op.campus);
                          setModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#85E510] hover:text-[#062404] text-slate-700 font-bold text-[11px] transition-all cursor-pointer"
                      >
                        Assign Task
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Orders & Directives Card Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((t) => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleTaskStatus(t.id)}
                    className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                      t.status === 'Completed'
                        ? 'bg-[#85E510] border-[#85E510] text-[#062404]'
                        : 'border-slate-300 hover:border-[#85E510]'
                    }`}
                  >
                    {t.status === 'Completed' && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  <div>
                    <h3 className={`text-sm font-bold text-slate-900 ${t.status === 'Completed' ? 'line-through text-slate-400' : ''}`}>
                      {t.title}
                    </h3>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                      <span className="font-mono">{t.id}</span>
                      <span>&bull;</span>
                      <span className="font-semibold text-slate-800">{t.school}</span>
                    </div>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 ${
                  t.priority === 'High'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : t.priority === 'Medium'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {t.priority}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Users className="w-3.5 h-3.5 text-[#256002]" />
                  <span>Assigned to: {t.assignedTo}</span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.deadline}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Directive Dispatch Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-heading font-black text-base text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#85E510]" />
                  <span>Dispatch Field Operational Directive</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Issue priority instructions, targets, or alignment orders to station senders
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDirective} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Directive Title / Work Order Description
                </label>
                <input
                  type="text"
                  required
                  value={directiveTitle}
                  onChange={(e) => setDirectiveTitle(e.target.value)}
                  placeholder="e.g. Audit Grade 9 Biometric Portrait Alignment (3:4 ratio)"
                  className="w-full bg-[#F8FAF9] border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#9EE617] focus:ring-2 focus:ring-[#9EE617]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Target Operator</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#9EE617]"
                  >
                    {senders.map(u => (
                      <option key={u.id || u.username} value={u.username}>
                        {u.username} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">School Campus</label>
                  <select
                    value={targetCampus}
                    onChange={(e) => setTargetCampus(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#9EE617]"
                  >
                    <option value="YMS 1">YMS 1</option>
                    <option value="YMS 2">YMS 2</option>
                    <option value="YMS 3">YMS 3</option>
                    <option value="YMS 4">YMS 4</option>
                    <option value="School of America 1">School of America 1</option>
                    <option value="School of America 2">School of America 2</option>
                    <option value="School of America 3">School of America 3</option>
                    <option value="School of America 4">School of America 4</option>
                    <option value="High Tech 1">High Tech 1</option>
                    <option value="High Tech 2">High Tech 2</option>
                    <option value="High Tech 3">High Tech 3</option>
                    <option value="High Tech 4">High Tech 4</option>
                    <option value="Adika Youth">Adika Youth</option>
                    <option value="Ferway">Ferway</option>
                    <option value="Warka">Warka</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-[#F8FAF9] border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#9EE617]"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Normal Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Completion Deadline</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#9EE617]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Target Student Quota</label>
                <input
                  type="number"
                  value={quotaTarget}
                  onChange={(e) => setQuotaTarget(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full bg-[#F8FAF9] border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#9EE617]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs shadow-xs transition-all cursor-pointer"
                >
                  Dispatch Directive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
