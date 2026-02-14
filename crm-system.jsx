import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Users, Target, Calendar, FileText, LogOut, Plus, 
  Search, Filter, Download, X, Edit2, Trash2, Save, ChevronLeft,
  Mail, Phone, Building2, Clock, AlertCircle, CheckCircle2,
  LayoutGrid, List, Menu, User, Bell, TrendingUp, Activity
} from 'lucide-react';

// Add global styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow-x: hidden;
    }
    
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: rgba(26, 31, 58, 0.5);
    }
    
    ::-webkit-scrollbar-thumb {
      background: rgba(99, 102, 241, 0.5);
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(99, 102, 241, 0.7);
    }
  `;
  document.head.appendChild(style);
}

// Supabase client (replace with your actual credentials)
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
);

// Pipeline stages
const PIPELINE_STAGES = [
  { id: 'new', label: 'New Lead', color: '#3B82F6' },
  { id: 'qualified', label: 'Qualified', color: '#8B5CF6' },
  { id: 'follow-up', label: 'Follow-up', color: '#F59E0B' },
  { id: 'proposal', label: 'Proposal', color: '#10B981' },
  { id: 'closed-won', label: 'Closed Won', color: '#059669' },
  { id: 'closed-lost', label: 'Closed Lost', color: '#EF4444' }
];

// Utility functions
const getLocalStorageKey = (userId, type) => `crm_${userId}_${type}`;

const saveToLocalStorage = (userId, type, data) => {
  localStorage.setItem(getLocalStorageKey(userId, type), JSON.stringify(data));
};

const getFromLocalStorage = (userId, type) => {
  const data = localStorage.getItem(getLocalStorageKey(userId, type));
  return data ? JSON.parse(data) : null;
};

const exportToCSV = (data, filename) => {
  const headers = ['Name', 'Company', 'Email', 'Phone', 'Source', 'Stage', 'Created', 'Latest Note'];
  const rows = data.map(lead => [
    lead.name,
    lead.company,
    lead.email,
    lead.phone,
    lead.source,
    PIPELINE_STAGES.find(s => s.id === lead.stage)?.label || lead.stage,
    new Date(lead.createdAt).toLocaleDateString(),
    lead.notes?.[0]?.text || ''
  ]);
  
  const csv = [headers, ...rows].map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Main App Component
export default function CRMApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Data states
  const [leads, setLeads] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [activities, setActivities] = useState([]);
  
  // UI states
  const [selectedLead, setSelectedLead] = useState(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [pipelineView, setPipelineView] = useState('kanban'); // 'kanban' or 'table'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('all');

  // Check auth status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load user data
  useEffect(() => {
    if (user) {
      const storedLeads = getFromLocalStorage(user.id, 'leads') || [];
      const storedMeetings = getFromLocalStorage(user.id, 'meetings') || [];
      const storedActivities = getFromLocalStorage(user.id, 'activities') || [];
      
      setLeads(storedLeads);
      setMeetings(storedMeetings);
      setActivities(storedActivities);
    }
  }, [user]);

  // Save data to localStorage
  useEffect(() => {
    if (user) {
      saveToLocalStorage(user.id, 'leads', leads);
    }
  }, [leads, user]);

  useEffect(() => {
    if (user) {
      saveToLocalStorage(user.id, 'meetings', meetings);
    }
  }, [meetings, user]);

  useEffect(() => {
    if (user) {
      saveToLocalStorage(user.id, 'activities', activities);
    }
  }, [activities, user]);

  // Add activity
  const addActivity = (type, message, leadId = null) => {
    const newActivity = {
      id: Date.now().toString(),
      type,
      message,
      leadId,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [newActivity, ...prev.slice(0, 49)]);
  };

  // Lead operations
  const addLead = (leadData) => {
    const newLead = {
      id: Date.now().toString(),
      ...leadData,
      stage: leadData.stage || 'new',
      createdAt: new Date().toISOString(),
      notes: [],
      reminders: []
    };
    setLeads(prev => [newLead, ...prev]);
    addActivity('lead_created', `New lead added: ${leadData.name}`);
  };

  const updateLead = (leadId, updates) => {
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, ...updates } : lead
    ));
    addActivity('lead_updated', `Lead updated: ${updates.name || 'Unknown'}`, leadId);
  };

  const deleteLead = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    setLeads(prev => prev.filter(l => l.id !== leadId));
    addActivity('lead_deleted', `Lead deleted: ${lead?.name || 'Unknown'}`);
  };

  const addNote = (leadId, noteText) => {
    const note = {
      id: Date.now().toString(),
      text: noteText,
      timestamp: new Date().toISOString()
    };
    setLeads(prev => prev.map(lead => 
      lead.id === leadId 
        ? { ...lead, notes: [note, ...(lead.notes || [])] }
        : lead
    ));
    addActivity('note_added', `Note added to lead`, leadId);
  };

  const addReminder = (leadId, reminderData) => {
    const reminder = {
      id: Date.now().toString(),
      ...reminderData,
      createdAt: new Date().toISOString()
    };
    setLeads(prev => prev.map(lead => 
      lead.id === leadId 
        ? { ...lead, reminders: [...(lead.reminders || []), reminder] }
        : lead
    ));
    addActivity('reminder_set', `Follow-up reminder set`, leadId);
  };

  // Meeting operations
  const addMeeting = (meetingData) => {
    const newMeeting = {
      id: Date.now().toString(),
      ...meetingData,
      createdAt: new Date().toISOString()
    };
    setMeetings(prev => [newMeeting, ...prev]);
    addActivity('meeting_scheduled', `Meeting scheduled: ${meetingData.title}`, meetingData.leadId);
  };

  // Drag and drop handler
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId !== destination.droppableId) {
      const lead = leads.find(l => l.id === draggableId);
      updateLead(draggableId, { stage: destination.droppableId });
      addActivity('stage_changed', `${lead?.name} moved to ${PIPELINE_STAGES.find(s => s.id === destination.droppableId)?.label}`, draggableId);
    }
  };

  // Filter and search leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchTerm || 
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStage === 'all' || lead.stage === filterStage;
    
    return matchesSearch && matchesFilter;
  });

  // Get clients (closed-won leads)
  const clients = leads.filter(lead => lead.stage === 'closed-won');

  // Calculate dashboard stats
  const stats = {
    totalLeads: leads.length,
    newLeads: leads.filter(l => l.stage === 'new').length,
    qualified: leads.filter(l => l.stage === 'qualified').length,
    proposals: leads.filter(l => l.stage === 'proposal').length,
    closedWon: leads.filter(l => l.stage === 'closed-won').length,
    upcomingMeetings: meetings.filter(m => new Date(m.dateTime) > new Date()).length,
    overdueReminders: leads.reduce((count, lead) => {
      return count + (lead.reminders || []).filter(r => 
        new Date(r.date) < new Date() && !r.completed
      ).length;
    }, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366F1]"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <Sidebar 
        open={sidebarOpen}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        user={user}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          user={user}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          overdueCount={stats.overdueReminders}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {currentPage === 'dashboard' && (
              <Dashboard 
                stats={stats}
                activities={activities}
                meetings={meetings}
                leads={leads}
                onNavigate={setCurrentPage}
                onAddLead={() => setShowLeadModal(true)}
                
              />
            )}
            
            {currentPage === 'leads' && (
              <LeadsPage 
                leads={filteredLeads}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filterStage={filterStage}
                setFilterStage={setFilterStage}
                onAddLead={() => setShowLeadModal(true)}
                onEditLead={(lead) => {
                  setSelectedLead(lead);
                  setShowLeadModal(true);
                }}
                onDeleteLead={deleteLead}
                onExport={() => exportToCSV(filteredLeads, 'leads.csv')}
                
              />
            )}
            
            {currentPage === 'clients' && (
              <ClientsPage 
                clients={clients}
                onViewClient={(lead) => {
                  setSelectedLead(lead);
                  setShowLeadModal(true);
                }}
                
              />
            )}
            
            {currentPage === 'pipeline' && (
              <PipelinePage 
                leads={filteredLeads}
                view={pipelineView}
                setView={setPipelineView}
                onDragEnd={handleDragEnd}
                onEditLead={(lead) => {
                  setSelectedLead(lead);
                  setShowLeadModal(true);
                }}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                
              />
            )}
            
            {currentPage === 'meetings' && (
              <MeetingsPage 
                meetings={meetings}
                leads={leads}
                onAddMeeting={() => setShowMeetingModal(true)}
                
              />
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      {showLeadModal && (
        <LeadModal 
          lead={selectedLead}
          onClose={() => {
            setShowLeadModal(false);
            setSelectedLead(null);
          }}
          onSave={(data) => {
            if (selectedLead) {
              updateLead(selectedLead.id, data);
            } else {
              addLead(data);
            }
            setShowLeadModal(false);
            setSelectedLead(null);
          }}
          onAddNote={addNote}
          onAddReminder={addReminder}
        />
      )}

      {showMeetingModal && (
        <MeetingModal 
          leads={leads}
          onClose={() => setShowMeetingModal(false)}
          onSave={(data) => {
            addMeeting(data);
            setShowMeetingModal(false);
          }}
        />
      )}
    </div>
  );
}

// Auth Page Component
function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { name }
          }
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-8 w-full max-w-md shadow-2xl bg-white border border-gray-200"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-2xl mb-4">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] bg-clip-text text-transparent mb-2">
            CRM Pro
          </h1>
          <p className="text-gray-600">
            Manage your sales pipeline with ease
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none transition-all bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400"
                required={!isLogin}
                placeholder="Enter your name"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none transition-all bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400"
              required
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none transition-all bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400"
              required
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-[#6366F1]/50 transition-all disabled:opacity-50"
          >
            {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#6366F1] hover:text-[#8B5CF6] transition-colors text-sm font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Sidebar Component
function Sidebar({ open, currentPage, onNavigate, onToggle, user }) {
  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'leads', icon: Users, label: 'Leads' },
    { id: 'clients', icon: Target, label: 'Clients' },
    { id: 'pipeline', icon: Activity, label: 'Pipeline' },
    { id: 'meetings', icon: Calendar, label: 'Meetings' }
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? 280 : 80 }}
      className="bg-white border-r border-gray-200 flex flex-col relative z-10"
    >
      <div className="p-6 border-b border-gray-200">
        <motion.div 
          className="flex items-center gap-3"
          animate={{ justifyContent: open ? 'flex-start' : 'center' }}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center flex-shrink-0">
            <Target className="w-6 h-6 text-white" />
          </div>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h1 className="text-xl font-bold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] bg-clip-text text-transparent">
                CRM Pro
              </h1>
            </motion.div>
          )}
        </motion.div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
              currentPage === item.id
                ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white shadow-lg shadow-[#6366F1]/30'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {open && (
              <span>{item.label}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {open && <span>Sign Out</span>}
        </button>
      </div>
    </motion.aside>
  );
}

// Header Component  
function Header({ user, onToggleSidebar, overdueCount }) {
  return (
    <header className="bg-white/50 backdrop-blur-xl border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>

        <div className="flex items-center gap-4">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">{overdueCount} overdue reminders</span>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user.user_metadata?.name || user.email}
              </p>
              <p className="text-xs text-gray-500">
                {user.email}
              </p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// Dashboard Component
function Dashboard({ stats, activities, meetings, leads, onNavigate, onAddLead }) {
  const upcomingMeetings = meetings
    .filter(m => new Date(m.dateTime) > new Date())
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
    .slice(0, 5);

  const overdueReminders = leads
    .flatMap(lead => 
      (lead.reminders || [])
        .filter(r => new Date(r.date) < new Date() && !r.completed)
        .map(r => ({ ...r, leadName: lead.name, leadId: lead.id }))
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
        </div>
        <button
          onClick={onAddLead}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-xl font-semibold hover:shadow-lg hover:shadow-[#6366F1]/50 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Lead
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Leads"
          value={stats.totalLeads}
          icon={Users}
          color="#6366F1"
          trend="+12%"
          
        />
        <StatCard
          label="New Leads"
          value={stats.newLeads}
          icon={TrendingUp}
          color="#8B5CF6"
          
        />
        <StatCard
          label="Proposals"
          value={stats.proposals}
          icon={FileText}
          color="#F59E0B"
          
        />
        <StatCard
          label="Closed Won"
          value={stats.closedWon}
          icon={CheckCircle2}
          color="#10B981"
          trend="+8%"
          
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className={`backdrop-blur-xl rounded-2xl p-6 bg-white border border-gray-200 shadow-sm`}>
          <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
            text-gray-900
          }`}>
            <Activity className="w-5 h-5 text-[#6366F1]" />
            Recent Activity
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.slice(0, 10).map(activity => (
              <div key={activity.id} className={`flex items-start gap-3 p-3 rounded-lg bg-gray-50`}>
                <div className="w-8 h-8 bg-[#6366F1]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 text-[#6366F1]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-gray-700`}>
                    {activity.message}
                  </p>
                  <p className={`text-xs mt-1 text-gray-600`}>
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Meetings & Reminders */}
        <div className="space-y-6">
          {/* Upcoming Meetings */}
          <div className={`backdrop-blur-xl rounded-2xl p-6 bg-white border border-gray-200 shadow-sm`}>
            <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
              text-gray-900
            }`}>
              <Calendar className="w-5 h-5 text-[#8B5CF6]" />
              Upcoming Meetings
            </h2>
            <div className="space-y-3">
              {upcomingMeetings.length > 0 ? (
                upcomingMeetings.map(meeting => (
                  <div key={meeting.id} className={`flex items-center gap-3 p-3 rounded-lg bg-gray-50`}>
                    <div className="w-10 h-10 bg-[#8B5CF6]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-[#8B5CF6]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{meeting.title}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(meeting.dateTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No upcoming meetings</p>
              )}
            </div>
          </div>

          {/* Overdue Reminders */}
          {overdueReminders.length > 0 && (
            <div className="bg-red-500/5 backdrop-blur-xl rounded-2xl border border-red-500/20 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                Overdue Follow-ups
              </h2>
              <div className="space-y-3">
                {overdueReminders.slice(0, 5).map(reminder => (
                  <div key={reminder.id} className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-red-300 truncate">{reminder.leadName}</p>
                      <p className="text-sm text-red-400">{reminder.note}</p>
                      <p className="text-xs text-red-500 mt-1">
                        Due: {new Date(reminder.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className="bg-white/50 backdrop-blur-xl rounded-2xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-4">Pipeline Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {PIPELINE_STAGES.map(stage => {
            const count = leads.filter(l => l.stage === stage.id).length;
            return (
              <div
                key={stage.id}
                className="p-4 bg-gray-50/50 rounded-xl border border-gray-300/50 hover:border-gray-600 transition-all cursor-pointer"
                onClick={() => onNavigate('pipeline')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-xs text-gray-600 font-medium">{stage.label}</span>
                </div>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// Stat Card Component
function StatCard({ label, value, icon: Icon, color, trend }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`backdrop-blur-xl rounded-2xl p-6 transition-all bg-white border border-gray-200 hover:border-gray-300 shadow-sm`}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        {trend && (
          <span className="text-green-500 text-sm font-semibold">{trend}</span>
        )}
      </div>
      <p className={`text-sm mb-1 text-gray-600`}>
        {label}
      </p>
      <p className={`text-3xl font-bold ${text-gray-900}`}>
        {value}
      </p>
    </motion.div>
  );
}

// Leads Page Component
function LeadsPage({ 
  leads, 
  searchTerm, 
  setSearchTerm, 
  filterStage, 
  setFilterStage,
  onAddLead,
  onEditLead,
  onDeleteLead,
  onExport,
  theme
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${text-gray-900}`}>
            Leads
          </h1>
          <p className={false ? 'text-gray-600' : 'text-gray-600'}>
            Manage and track all your leads
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onExport}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border bg-white hover:bg-gray-50 border-gray-300`}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={onAddLead}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#6366F1]/50 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`backdrop-blur-xl rounded-2xl p-6 bg-white border border-gray-200 shadow-sm`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400`}
            />
          </div>
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className={`px-4 py-3 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none bg-gray-50 border-gray-300 text-gray-900`}
          >
            <option value="all">All Stages</option>
            {PIPELINE_STAGES.map(stage => (
              <option key={stage.id} value={stage.id}>{stage.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className={`backdrop-blur-xl rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={false ? 'bg-gray-50' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600`}>Name</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600`}>Company</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600`}>Contact</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600`}>Stage</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600`}>Source</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600`}>Created</th>
                <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-600`}>Actions</th>
              </tr>
            </thead>
            <tbody className={false ? 'divide-y divide-gray-700/50' : 'divide-y divide-gray-200'}>
              {leads.map(lead => {
                const stage = PIPELINE_STAGES.find(s => s.id === lead.stage);
                return (
                  <tr key={lead.id} className={false ? 'hover:bg-gray-50/50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4">
                      <div className={`font-medium ${text-gray-900}`}>
                        {lead.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={false ? 'text-gray-600' : 'text-gray-600'}>
                        {lead.company || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-3 h-3" />
                          {lead.email}
                        </div>
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-3 h-3" />
                            {lead.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: `${stage?.color}20`,
                          color: stage?.color
                        }}
                      >
                        {stage?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-600">{lead.source || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-600 text-sm">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEditLead(lead)}
                          className="p-2 hover:bg-[#6366F1]/20 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-[#6366F1]" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this lead?')) {
                              onDeleteLead(lead.id);
                            }
                          }}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

// Clients Page Component
function ClientsPage({ clients, onViewClient }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className={`text-3xl font-bold mb-2 ${text-gray-900}`}>
          Clients
        </h1>
        <p className={false ? 'text-gray-600' : 'text-gray-600'}>
          Manage your closed-won clients
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => (
          <motion.div
            key={client.id}
            whileHover={{ y: -4 }}
            className={`backdrop-blur-xl rounded-2xl p-6 transition-all cursor-pointer bg-white border border-gray-200 hover:border-green-400 shadow-sm`}
            onClick={() => onViewClient(client)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className={`text-lg font-bold mb-1 ${text-gray-900}`}>
                  {client.name}
                </h3>
                {client.company && (
                  <p className={`text-sm flex items-center gap-2 text-gray-600`}>
                    <Building2 className="w-4 h-4" />
                    {client.company}
                  </p>
                )}
              </div>
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className={`flex items-center gap-2 text-sm text-gray-600`}>
                <Mail className="w-4 h-4" />
                {client.email}
              </div>
              {client.phone && (
                <div className={`flex items-center gap-2 text-sm text-gray-600`}>
                  <Phone className="w-4 h-4" />
                  {client.phone}
                </div>
              )}
            </div>

            <div className={`pt-4 border-t border-gray-200`}>
              <p className={`text-xs text-gray-500`}>
                Client since {new Date(client.createdAt).toLocaleDateString()}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {clients.length === 0 && (
        <div className="text-center py-12">
          <Target className={`w-16 h-16 mx-auto mb-4 text-gray-600`} />
          <p className={false ? 'text-gray-600' : 'text-gray-600'}>No clients yet</p>
        </div>
      )}
    </motion.div>
  );
}

// Pipeline Page Component
function PipelinePage({ leads, view, setView, onDragEnd, onEditLead, searchTerm, setSearchTerm }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${text-gray-900}`}>
            Sales Pipeline
          </h1>
          <p className={false ? 'text-gray-600' : 'text-gray-600'}>
            Track leads through your sales process
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none w-64 bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400`}
            />
          </div>
          <div className={`flex rounded-lg p-1 border bg-white border-gray-300`}>
            <button
              onClick={() => setView('kanban')}
              className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
                view === 'kanban' 
                  ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white'
                  : false ? 'text-gray-600 hover:text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Kanban
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
                view === 'table' 
                  ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white'
                  : false ? 'text-gray-600 hover:text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
              Table
            </button>
          </div>
        </div>
      </div>

      {view === 'kanban' ? (
        <KanbanView leads={leads} onDragEnd={onDragEnd} onEditLead={onEditLead}  />
      ) : (
        <TableView leads={leads} onEditLead={onEditLead}  />
      )}
    </motion.div>
  );
}

// Kanban View Component
function KanbanView({ leads, onDragEnd, onEditLead }) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {PIPELINE_STAGES.map(stage => {
          const stageLeads = leads.filter(l => l.stage === stage.id);
          return (
            <div key={stage.id} className="flex flex-col">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <h3 className={`font-semibold ${text-gray-900}`}>
                    {stage.label}
                  </h3>
                  <span className={`text-sm text-gray-500`}>
                    ({stageLeads.length})
                  </span>
                </div>
              </div>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-3 p-3 rounded-xl transition-colors border-2 ${
                      snapshot.isDraggingOver 
                        ? 'bg-[#6366F1]/10 border-gray-300' 
                        : false
                        ? 'bg-white/30 border-transparent'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    style={{ minHeight: '500px' }}
                  >
                    {stageLeads.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`rounded-xl p-4 border transition-all cursor-move bg-white border-gray-300 hover:border-gray-400 shadow-sm ${snapshot.isDragging ? 'shadow-2xl shadow-[#6366F1]/50 rotate-2' : ''}`}
                            onClick={() => onEditLead(lead)}
                          >
                            <h4 className={`font-semibold mb-2 ${text-gray-900}`}>
                              {lead.name}
                            </h4>
                            {lead.company && (
                              <p className={`text-sm mb-2 text-gray-600`}>
                                {lead.company}
                              </p>
                            )}
                            <div className="space-y-1">
                              <div className={`flex items-center gap-2 text-xs text-gray-500`}>
                                <Mail className="w-3 h-3" />
                                {lead.email}
                              </div>
                              {lead.phone && (
                                <div className={`flex items-center gap-2 text-xs text-gray-500`}>
                                  <Phone className="w-3 h-3" />
                                  {lead.phone}
                                </div>
                              )}
                            </div>
                            {lead.notes && lead.notes.length > 0 && (
                              <div className={`mt-3 pt-3 border-t border-gray-200`}>
                                <p className={`text-xs line-clamp-2 text-gray-600`}>
                                  {lead.notes[0].text}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

// Table View Component
function TableView({ leads, onEditLead }) {
  return (
    <div className="bg-white/50 backdrop-blur-xl rounded-2xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stage</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Source</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {leads.map(lead => {
              const stage = PIPELINE_STAGES.find(s => s.id === lead.stage);
              return (
                <tr
                  key={lead.id}
                  onClick={() => onEditLead(lead)}
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium">{lead.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-600">{lead.company || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: `${stage?.color}20`,
                        color: stage?.color
                      }}
                    >
                      {stage?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-600">{lead.email}</span>
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600">{lead.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-600">{lead.source || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-600 text-sm">
                      {lead.notes && lead.notes.length > 0 
                        ? new Date(lead.notes[0].timestamp).toLocaleDateString()
                        : new Date(lead.createdAt).toLocaleDateString()
                      }
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Meetings Page Component
function MeetingsPage({ meetings, leads, onAddMeeting }) {
  const upcomingMeetings = meetings.filter(m => new Date(m.dateTime) >= new Date());
  const pastMeetings = meetings.filter(m => new Date(m.dateTime) < new Date());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Meetings</h1>
          <p className="text-gray-600">Schedule and track client meetings</p>
        </div>
        <button
          onClick={onAddMeeting}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-xl font-semibold hover:shadow-lg hover:shadow-[#6366F1]/50 transition-all"
        >
          <Plus className="w-5 h-5" />
          Schedule Meeting
        </button>
      </div>

      {/* Upcoming Meetings */}
      <div className="bg-white/50 backdrop-blur-xl rounded-2xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-4">Upcoming Meetings</h2>
        <div className="space-y-4">
          {upcomingMeetings.length > 0 ? (
            upcomingMeetings.map(meeting => {
              const lead = leads.find(l => l.id === meeting.leadId);
              return (
                <div
                  key={meeting.id}
                  className="flex items-start gap-4 p-4 bg-gray-50/50 rounded-xl border border-gray-300/50 hover:border-gray-600 transition-all"
                >
                  <div className="w-12 h-12 bg-[#8B5CF6]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-[#8B5CF6]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{meeting.title}</h3>
                    {lead && (
                      <p className="text-sm text-gray-600 mb-2">
                        with {lead.name} {lead.company ? `(${lead.company})` : ''}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date(meeting.dateTime).toLocaleString()}
                      </div>
                    </div>
                    {meeting.notes && (
                      <p className="mt-2 text-sm text-gray-600">{meeting.notes}</p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500 text-center py-8">No upcoming meetings</p>
          )}
        </div>
      </div>

      {/* Past Meetings */}
      {pastMeetings.length > 0 && (
        <div className="bg-white/50 backdrop-blur-xl rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Past Meetings</h2>
          <div className="space-y-4">
            {pastMeetings.map(meeting => {
              const lead = leads.find(l => l.id === meeting.leadId);
              return (
                <div
                  key={meeting.id}
                  className="flex items-start gap-4 p-4 bg-gray-50/50 rounded-xl border border-gray-300/50 opacity-60"
                >
                  <div className="w-12 h-12 bg-gray-700/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{meeting.title}</h3>
                    {lead && (
                      <p className="text-sm text-gray-600 mb-2">
                        with {lead.name} {lead.company ? `(${lead.company})` : ''}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date(meeting.dateTime).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Lead Modal Component
function LeadModal({ lead, onClose, onSave, onAddNote, onAddReminder }) {
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    company: lead?.company || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    source: lead?.source || '',
    stage: lead?.stage || 'new'
  });

  const [activeTab, setActiveTab] = useState('details');
  const [newNote, setNewNote] = useState('');
  const [newReminder, setNewReminder] = useState({
    date: '',
    note: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleAddNote = () => {
    if (newNote.trim() && lead) {
      onAddNote(lead.id, newNote);
      setNewNote('');
    }
  };

  const handleAddReminder = () => {
    if (newReminder.date && newReminder.note && lead) {
      onAddReminder(lead.id, newReminder);
      setNewReminder({ date: '', note: '' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-300/50">
          <h2 className="text-2xl font-bold">
            {lead ? 'Edit Lead' : 'New Lead'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs (only for existing leads) */}
        {lead && (
          <div className="flex gap-4 px-6 pt-4 border-b border-gray-300/50">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 font-medium transition-all ${
                activeTab === 'details'
                  ? 'text-[#6366F1] border-b-2 border-[#6366F1]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 font-medium transition-all ${
                activeTab === 'notes'
                  ? 'text-[#6366F1] border-b-2 border-[#6366F1]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Notes ({lead.notes?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className={`px-4 py-2 font-medium transition-all ${
                activeTab === 'reminders'
                  ? 'text-[#6366F1] border-b-2 border-[#6366F1]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Reminders ({lead.reminders?.filter(r => !r.completed).length || 0})
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {(!lead || activeTab === 'details') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source
                  </label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="e.g., Website, Referral, LinkedIn"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stage
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none"
                  >
                    {PIPELINE_STAGES.map(stage => (
                      <option key={stage.id} value={stage.id}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-50 rounded-lg hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-lg font-semibold hover:shadow-lg hover:shadow-[#6366F1]/50 transition-all"
                >
                  {lead ? 'Update Lead' : 'Create Lead'}
                </button>
              </div>
            </form>
          )}

          {lead && activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="bg-gray-50/50 rounded-xl p-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none resize-none"
                  rows="3"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="mt-3 px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-lg font-semibold hover:shadow-lg hover:shadow-[#6366F1]/50 transition-all disabled:opacity-50"
                >
                  Add Note
                </button>
              </div>

              <div className="space-y-3">
                {lead.notes?.map(note => (
                  <div key={note.id} className="bg-gray-50/50 rounded-xl p-4">
                    <p className="text-gray-700 mb-2">{note.text}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(note.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
                {(!lead.notes || lead.notes.length === 0) && (
                  <p className="text-gray-500 text-center py-8">No notes yet</p>
                )}
              </div>
            </div>
          )}

          {lead && activeTab === 'reminders' && (
            <div className="space-y-4">
              <div className="bg-gray-50/50 rounded-xl p-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={newReminder.date}
                      onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Note
                    </label>
                    <input
                      type="text"
                      value={newReminder.note}
                      onChange={(e) => setNewReminder({ ...newReminder, note: e.target.value })}
                      placeholder="What should you follow up on?"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none"
                    />
                  </div>
                  <button
                    onClick={handleAddReminder}
                    disabled={!newReminder.date || !newReminder.note}
                    className="px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-lg font-semibold hover:shadow-lg hover:shadow-[#6366F1]/50 transition-all disabled:opacity-50"
                  >
                    Set Reminder
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {lead.reminders?.filter(r => !r.completed).map(reminder => {
                  const isOverdue = new Date(reminder.date) < new Date();
                  return (
                    <div
                      key={reminder.id}
                      className={`rounded-xl p-4 border ${
                        isOverdue
                          ? 'bg-red-500/10 border-red-500/20'
                          : 'bg-gray-50/50 border-gray-300/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`font-medium mb-1 ${isOverdue ? 'text-red-400' : ''}`}>
                            {reminder.note}
                          </p>
                          <p className={`text-sm ${isOverdue ? 'text-red-500' : 'text-gray-600'}`}>
                            {new Date(reminder.date).toLocaleDateString()}
                            {isOverdue && ' (Overdue)'}
                          </p>
                        </div>
                        {isOverdue && (
                          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 ml-3" />
                        )}
                      </div>
                    </div>
                  );
                })}
                {(!lead.reminders || lead.reminders.filter(r => !r.completed).length === 0) && (
                  <p className="text-gray-500 text-center py-8">No active reminders</p>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Meeting Modal Component
function MeetingModal({ leads, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    leadId: '',
    dateTime: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-300/50">
          <h2 className="text-2xl font-bold">Schedule Meeting</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Product Demo, Follow-up Call"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lead/Client *
            </label>
            <select
              value={formData.leadId}
              onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none"
              required
            >
              <option value="">Select a lead...</option>
              {leads.map(lead => (
                <option key={lead.id} value={lead.id}>
                  {lead.name} {lead.company ? `(${lead.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.dateTime}
              onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes or agenda items..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none resize-none"
              rows="4"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-50 rounded-lg hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-lg font-semibold hover:shadow-lg hover:shadow-[#6366F1]/50 transition-all"
            >
              Schedule Meeting
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}