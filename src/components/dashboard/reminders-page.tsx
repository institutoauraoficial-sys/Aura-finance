"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Plus, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, Filter, Search, RefreshCw, Clock, CheckCircle2, XCircle, Bell, Link2, ExternalLink } from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useBranding } from "@/contexts/branding-context";
import { useLembretes } from "@/hooks/use-lembretes";
import { useUser } from "@/hooks/use-user";
import { useAccountFilter } from "@/hooks/use-account-filter";
import { createClient } from "@/lib/supabase/client";
import { ReminderModal } from "./reminder-modal";
import type { Lembrete, LembreteInput } from "@/hooks/use-lembretes";

type ViewMode = 'calendar' | 'list';
type FilterStatus = 'todos' | 'ativo' | 'executado' | 'cancelado';

export function RemindersPage() {
  const { t, language } = useLanguage();
  const { settings } = useBranding();
  const {
    lembretes,
    loading,
    createLembrete,
    updateLembrete,
    deleteLembrete,
    toggleStatus,
    isCreating,
    isUpdating,
    isDeleting,
  } = useLembretes();

  const { profile } = useUser();
  const { filter: accountFilter } = useAccountFilter();
  const calendarRef = useRef<FullCalendar>(null);
  const [mounted, setMounted] = useState(false);
  const [separateCalendars, setSeparateCalendars] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarView, setCalendarView] = useState<string>('dayGridMonth');
  const [googleCalendar, setGoogleCalendar] = useState<{ google_email: string; is_active: boolean; connected_at: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Lembrete | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('todos');
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");

  useEffect(() => {
    setMounted(true);
    const mobile = window.innerWidth < 768;
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsMobile(mobile);
    setIsTouch(touch);
    if (mobile) {
      setViewMode('list');
    }
  }, []);

  // Fetch Google Calendar integration status + check if calendars are separate
  useEffect(() => {
    const fetchGoogleCalendar = async () => {
      if (!profile?.id) return;
      const supabase = createClient();
      const { data } = await supabase
        .from('google_calendar_integrations')
        .select('google_email, is_active, connected_at, calendar_id_pf, calendar_id_pj')
        .eq('usuario_id', profile.id)
        .eq('is_active', true)
        .maybeSingle();
      if (data) {
        setGoogleCalendar(data);
        setSeparateCalendars(
          !!(data.calendar_id_pf && data.calendar_id_pj && data.calendar_id_pf !== data.calendar_id_pj)
        );
      }
    };
    fetchGoogleCalendar();
  }, [profile?.id]);

  // Primary color from branding
  const primaryColor = settings.primaryColor || '#22C55E';

  // Generate recurring instances like Google Calendar
  const generateRecurringDates = useCallback((lembrete: Lembrete, maxInstances = 52) => {
    const dates: string[] = [];
    const [year, month, day] = lembrete.data_lembrete.split('-').map(Number);
    const baseDate = new Date(year, month - 1, day);
    
    // Start from the original date, generate future instances
    for (let i = 0; i < maxInstances; i++) {
      const d = new Date(baseDate);
      switch (lembrete.tipo_recorrencia) {
        case 'diario':
          d.setDate(d.getDate() + i);
          break;
        case 'semanal':
          d.setDate(d.getDate() + (i * 7));
          break;
        case 'mensal':
          d.setMonth(d.getMonth() + i);
          break;
        case 'anual':
          d.setFullYear(d.getFullYear() + i);
          break;
        default:
          return dates;
      }
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${dd}`);
    }
    return dates;
  }, []);

  // Filter lembretes by calendar_type when calendars are separate
  const calendarTypeFilter = accountFilter === 'pj' ? 'pj' : 'pf';

  const visibleLembretes = useMemo(() => {
    if (!separateCalendars) return lembretes;
    return lembretes.filter(l => l.calendar_type === calendarTypeFilter);
  }, [lembretes, separateCalendars, calendarTypeFilter]);

  // Map lembretes to FullCalendar events
  const calendarEvents = useMemo(() => {
    const events: any[] = [];

    // Colors for PF vs PJ when calendars are separate
    const pfColor = '#3b82f6'; // blue-500
    const pjColor = '#a855f7'; // purple-500

    visibleLembretes
      .filter(l => filterStatus === 'todos' || l.status === filterStatus)
      .filter(l => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return l.titulo.toLowerCase().includes(search) || 
               l.descricao?.toLowerCase().includes(search);
      })
      .forEach(l => {
        let backgroundColor = separateCalendars
          ? (l.calendar_type === 'pj' ? pjColor : pfColor)
          : primaryColor;
        let borderColor = backgroundColor;
        let textColor = '#ffffff';

        if (l.status === 'executado') {
          backgroundColor = '#22c55e';
          borderColor = '#16a34a';
        } else if (l.status === 'cancelado') {
          backgroundColor = '#6b7280';
          borderColor = '#4b5563';
          textColor = '#9ca3af';
        }

        if (l.recorrente && l.tipo_recorrencia && l.status === 'ativo') {
          // Generate recurring instances
          const dates = generateRecurringDates(l);
          dates.forEach((date, idx) => {
            const startDate = l.hora_lembrete ? `${date}T${l.hora_lembrete}` : date;
            const endDate = (l.hora_lembrete && l.hora_fim) ? `${date}T${l.hora_fim}` : undefined;
            events.push({
              id: `${l.id}-r${idx}`,
              title: l.titulo,
              start: startDate,
              end: endDate,
              allDay: !l.hora_lembrete,
              backgroundColor,
              borderColor,
              textColor,
              editable: idx === 0, // Only original is draggable
              extendedProps: { lembrete: l, isRecurringInstance: idx > 0 },
              classNames: [],
            });
          });
        } else {
          // Single event
          const startDate = l.hora_lembrete 
            ? `${l.data_lembrete}T${l.hora_lembrete}` 
            : l.data_lembrete;
          const endDate = (l.hora_lembrete && l.hora_fim)
            ? `${l.data_lembrete}T${l.hora_fim}`
            : undefined;

          events.push({
            id: String(l.id),
            title: l.titulo,
            start: startDate,
            end: endDate,
            allDay: !l.hora_lembrete,
            backgroundColor,
            borderColor,
            textColor,
            extendedProps: { lembrete: l, isRecurringInstance: false },
            classNames: l.status === 'cancelado' ? ['line-through opacity-60'] : [],
          });
        }
      });

    return events;
  }, [visibleLembretes, filterStatus, searchTerm, primaryColor, separateCalendars, generateRecurringDates]);

  // Filtered list for list view
  const filteredList = useMemo(() => {
    return visibleLembretes
      .filter(l => filterStatus === 'todos' || l.status === filterStatus)
      .filter(l => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return l.titulo.toLowerCase().includes(search) || 
               l.descricao?.toLowerCase().includes(search);
      })
      .sort((a, b) => {
        const dateA = new Date(a.data_lembrete + (a.hora_lembrete ? `T${a.hora_lembrete}` : ''));
        const dateB = new Date(b.data_lembrete + (b.hora_lembrete ? `T${b.hora_lembrete}` : ''));
        return dateA.getTime() - dateB.getTime();
      });
  }, [visibleLembretes, filterStatus, searchTerm]);

  const handleDateSelect = useCallback((selectInfo: any) => {
    setSelectedReminder(null);
    const startStr = selectInfo.startStr;
    // Extract date
    setSelectedDate(startStr.split('T')[0]);
    // Extract time if clicking on a time slot (Day/Week view)
    if (startStr.includes('T')) {
      const timePart = startStr.split('T')[1];
      if (timePart) {
        setSelectedTime(timePart.substring(0, 5));
      }
    } else {
      setSelectedTime("");
    }
    setIsModalOpen(true);
  }, []);

  const handleEventClick = useCallback((clickInfo: any) => {
    const lembrete = clickInfo.event.extendedProps.lembrete as Lembrete;
    setSelectedReminder(lembrete);
    setSelectedDate("");
    setIsModalOpen(true);
  }, []);

  const handleEventDrop = useCallback(async (info: any) => {
    const lembrete = info.event.extendedProps.lembrete as Lembrete;
    const newStart = info.event.start;
    if (!newStart) return;

    const year = newStart.getFullYear();
    const month = String(newStart.getMonth() + 1).padStart(2, '0');
    const day = String(newStart.getDate()).padStart(2, '0');
    const newDate = `${year}-${month}-${day}`;

    let newTime: string | null = null;
    if (!info.event.allDay) {
      const hours = String(newStart.getHours()).padStart(2, '0');
      const minutes = String(newStart.getMinutes()).padStart(2, '0');
      newTime = `${hours}:${minutes}`;
    }

    try {
      await updateLembrete({
        id: lembrete.id,
        titulo: lembrete.titulo,
        descricao: lembrete.descricao,
        data_lembrete: newDate,
        hora_lembrete: newTime || lembrete.hora_lembrete,
        hora_fim: lembrete.hora_fim,
        recorrente: lembrete.recorrente,
        tipo_recorrencia: lembrete.tipo_recorrencia,
      });
    } catch {
      info.revert();
    }
  }, [updateLembrete]);

  const handleNewReminder = () => {
    setSelectedReminder(null);
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedTime("");
    setIsModalOpen(true);
  };

  const handleSave = async (data: LembreteInput & { id?: number }) => {
    if (data.id) {
      await updateLembrete(data as LembreteInput & { id: number });
    } else {
      await createLembrete(data);
    }
  };

  const handleDatesSet = (dateInfo: any) => {
    setCurrentTitle(dateInfo.view.title);
  };

  const handlePrev = () => calendarRef.current?.getApi().prev();
  const handleNext = () => calendarRef.current?.getApi().next();
  const handleToday = () => calendarRef.current?.getApi().today();

  const changeCalendarView = (view: string) => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.changeView(view);
      setCalendarView(view);
    }
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-xs rounded-full font-medium">
            <Bell className="w-3 h-3" />
            {t('reminders.statusActive')}
          </span>
        );
      case 'executado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-full font-medium">
            <CheckCircle2 className="w-3 h-3" />
            {t('reminders.statusCompleted')}
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border-medium)] text-[var(--text-secondary)] text-xs rounded-full font-medium">
            <XCircle className="w-3 h-3" />
            {t('reminders.statusCancelled')}
          </span>
        );
    }
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">{t('reminders.title')}</h1>
            {separateCalendars && (
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium border",
                accountFilter === 'pj'
                  ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                  : "bg-blue-500/10 border-blue-500/20 text-blue-400"
              )}>
                {accountFilter === 'pj' ? `🏢 ${t('reminders.pj')}` : `👤 ${t('reminders.personal')}`}
              </span>
            )}
            {googleCalendar ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium">
                <Link2 className="w-3 h-3" />
                {t('reminders.googleCalendar')}
              </span>
            ) : (
              <a
                href="/dashboard/configuracoes?tab=integrations"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] text-xs rounded-full font-medium transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                {t('reminders.connectGoogle')}
              </a>
            )}
          </div>
          <p className="text-[var(--text-secondary)] text-xs md:text-sm mt-1">
            {t('reminders.subtitle')}
            {googleCalendar && (
              <span className="text-emerald-400/70"> · {t('reminders.linkedTo')} {googleCalendar.google_email}</span>
            )}
          </p>
        </div>
        <button
          onClick={handleNewReminder}
          className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-primary hover:bg-primary/90 active:scale-95 text-white rounded-lg transition-all font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('reminders.newReminder')}</span>
          <span className="sm:hidden">{t('reminders.new')}</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('reminders.searchPlaceholder')}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[var(--input-text)] placeholder-[var(--input-placeholder)] focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--text-tertiary)] hidden md:block" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--input-text)] appearance-none focus:outline-none focus:border-primary transition-colors"
            >
              <option value="todos">{t('reminders.filterAll')}</option>
              <option value="ativo">{t('reminders.filterActive')}</option>
              <option value="executado">{t('reminders.filterCompleted')}</option>
              <option value="cancelado">{t('reminders.filterCancelled')}</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all",
                viewMode === 'calendar'
                  ? "bg-primary text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{t('reminders.viewCalendar')}</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all",
                viewMode === 'list'
                  ? "bg-primary text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">{t('reminders.viewList')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
          {/* Custom Navigation */}
          <div className="flex flex-col gap-3 p-3 sm:p-4 border-b border-[var(--border-default)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={handlePrev}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)] rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)] rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
                <h2 className="text-sm sm:text-lg font-semibold text-[var(--text-primary)] capitalize ml-1 sm:ml-2 truncate">
                  {currentTitle}
                </h2>
              </div>
              <button
                onClick={handleToday}
                className="px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 active:bg-primary/20 border border-primary/20 rounded-lg transition-colors flex-shrink-0"
              >
                {t('reminders.today')}
              </button>
            </div>
            <div className="flex items-center gap-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg p-1 self-start">
              {[
                { key: 'timeGridDay', label: t('reminders.day') },
                { key: 'timeGridWeek', label: t('reminders.week') },
                { key: 'dayGridMonth', label: t('reminders.month') },
              ].map(v => (
                <button
                  key={v.key}
                  onClick={() => changeCalendarView(v.key)}
                  className={cn(
                    "px-3 py-2 min-h-[40px] rounded-md text-xs font-medium transition-all",
                    calendarView === v.key
                      ? "bg-primary text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:text-[var(--text-primary)]"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* FullCalendar */}
          <div className="p-2 md:p-4 fullcalendar-dark">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="dayGridMonth"
              headerToolbar={false}
              locale={language === 'pt' ? 'pt-br' : language === 'es' ? 'es' : 'en'}
              events={calendarEvents}
              editable={!isTouch}
              selectable={true}
              eventDrop={handleEventDrop}
              eventResize={handleEventDrop}
              select={handleDateSelect}
              eventClick={handleEventClick}
              datesSet={handleDatesSet}
              longPressDelay={500}
              height="auto"
              dayMaxEvents={isMobile ? 2 : 3}
              eventDisplay="block"
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false,
                hour12: false,
              }}
              firstDay={0}
              fixedWeekCount={false}
              showNonCurrentDates={true}
              allDayText={t('reminders.allDay')}
              nowIndicator={true}
              buttonText={{
                today: t('reminders.today'),
                month: t('reminders.month'),
                week: t('reminders.week'),
                day: t('reminders.day'),
                list: t('reminders.viewList'),
              }}
            />
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <CalendarIcon className="w-16 h-16 text-[var(--text-muted)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">
                {t('reminders.noResults')}
              </h3>
              <p className="text-sm text-[var(--text-tertiary)] text-center mb-6">
                {searchTerm || filterStatus !== 'todos'
                  ? t('reminders.noResultsHint')
                  : t('reminders.emptyHint')}
              </p>
              {!searchTerm && filterStatus === 'todos' && (
                <button
                  onClick={handleNewReminder}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {t('reminders.newReminder')}
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-default)]">
              {filteredList.map((lembrete) => {
                const isPast = new Date(lembrete.data_lembrete) < new Date(new Date().toISOString().split('T')[0]);
                const isToday = lembrete.data_lembrete === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={lembrete.id}
                    onClick={() => {
                      setSelectedReminder(lembrete);
                      setSelectedDate("");
                      setIsModalOpen(true);
                    }}
                    className={cn(
                      "flex items-center gap-4 p-4 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors",
                      lembrete.status === 'cancelado' && "opacity-60"
                    )}
                  >
                    {/* Date indicator */}
                    <div className={cn(
                      "flex flex-col items-center justify-center w-14 h-14 rounded-xl border flex-shrink-0",
                      isToday
                        ? "bg-primary/20 border-primary/30"
                        : isPast && lembrete.status === 'ativo'
                          ? "bg-red-500/10 border-red-500/20"
                          : "bg-[var(--bg-hover)] border-[var(--border-default)]"
                    )}>
                      <span className={cn(
                        "text-lg font-bold leading-none",
                        isToday ? "text-primary" : isPast && lembrete.status === 'ativo' ? "text-red-400" : "text-[var(--text-primary)]"
                      )}>
                        {new Date(lembrete.data_lembrete + 'T12:00:00').getDate()}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] uppercase mt-0.5">
                        {new Date(lembrete.data_lembrete + 'T12:00:00').toLocaleDateString(language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US', { month: 'short' })}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn(
                          "text-sm font-medium truncate",
                          lembrete.status === 'cancelado' ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"
                        )}>
                          {lembrete.titulo}
                        </h3>
                        {lembrete.recorrente && (
                          <RefreshCw className="w-3 h-3 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                        {lembrete.hora_lembrete && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(lembrete.hora_lembrete)}
                          </span>
                        )}
                        {lembrete.descricao && (
                          <span className="truncate">{lembrete.descricao}</span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex-shrink-0">
                      {getStatusBadge(lembrete.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reminder Modal */}
      <ReminderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedReminder(null);
          setSelectedDate("");
          setSelectedTime("");
        }}
        onSave={handleSave}
        onDelete={deleteLembrete}
        onToggleStatus={toggleStatus}
        reminder={selectedReminder}
        defaultDate={selectedDate}
        defaultTime={selectedTime}
        isSaving={isCreating || isUpdating}
        isDeleting={isDeleting}
      />

      {/* FullCalendar Dark Theme Styles */}
      <style jsx global>{`
        .fullcalendar-dark {
          --fc-border-color: rgba(255, 255, 255, 0.05);
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: rgba(255, 255, 255, 0.02);
          --fc-list-event-hover-bg-color: rgba(255, 255, 255, 0.05);
          --fc-today-bg-color: color-mix(in srgb, var(--primary) 8%, transparent);
          --fc-event-border-color: transparent;
          --fc-now-indicator-color: var(--primary);
        }

        .fullcalendar-dark .fc {
          font-family: inherit;
        }

        .fullcalendar-dark .fc-theme-standard td,
        .fullcalendar-dark .fc-theme-standard th {
          border-color: rgba(255, 255, 255, 0.05);
        }

        .fullcalendar-dark .fc-col-header-cell {
          padding: 12px 0;
          background: rgba(255, 255, 255, 0.02);
        }

        .fullcalendar-dark .fc-col-header-cell-cushion {
          color: #9ca3af;
          font-weight: 500;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-decoration: none;
        }

        .fullcalendar-dark .fc-daygrid-day-number {
          color: #d1d5db;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 8px;
          text-decoration: none;
        }

        .fullcalendar-dark .fc-day-today .fc-daygrid-day-number {
          color: var(--primary);
          font-weight: 700;
        }

        .fullcalendar-dark .fc-day-other .fc-daygrid-day-number {
          color: #4b5563;
        }

        .fullcalendar-dark .fc-event {
          border-radius: 6px;
          padding: 2px 6px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
          margin: 1px 2px;
        }

        .fullcalendar-dark .fc-event:hover {
          filter: brightness(1.15);
        }

        .fullcalendar-dark .fc-event-title {
          font-weight: 500;
        }

        .fullcalendar-dark .fc-daygrid-event-dot {
          display: none;
        }

        .fullcalendar-dark .fc-daygrid-day-frame {
          min-height: 100px;
        }

        .fullcalendar-dark .fc-more-link {
          color: var(--primary);
          font-weight: 600;
          font-size: 0.75rem;
        }

        .fullcalendar-dark .fc-popover {
          background: #1f2937;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }

        .fullcalendar-dark .fc-popover-header {
          background: rgba(255, 255, 255, 0.05);
          color: #d1d5db;
          font-weight: 600;
          padding: 8px 12px;
          border-radius: 12px 12px 0 0;
        }

        .fullcalendar-dark .fc-popover-body {
          padding: 4px;
        }

        .fullcalendar-dark .fc-highlight {
          background: color-mix(in srgb, var(--primary) 15%, transparent);
        }

        .fullcalendar-dark .fc-daygrid-day:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        /* TimeGrid (Day/Week) styles */
        .fullcalendar-dark .fc-timegrid-slot-label-cushion {
          color: #6b7280;
          font-size: 0.7rem;
          font-weight: 500;
        }

        .fullcalendar-dark .fc-timegrid-axis-cushion {
          color: #6b7280;
          font-size: 0.7rem;
        }

        .fullcalendar-dark .fc-timegrid-slot {
          height: 3em;
        }

        .fullcalendar-dark .fc-timegrid-now-indicator-line {
          border-color: var(--primary);
        }

        .fullcalendar-dark .fc-timegrid-now-indicator-arrow {
          border-top-color: var(--primary);
        }

        .fullcalendar-dark .fc-timegrid-event {
          border-radius: 6px;
          border: none;
        }

        .fullcalendar-dark .fc-timegrid-col.fc-day-today {
          background: color-mix(in srgb, var(--primary) 5%, transparent);
        }

        .fullcalendar-dark .fc-scrollgrid {
          border: none;
        }

        .fullcalendar-dark .fc-scrollgrid-section > * {
          border: none;
        }

        @media (max-width: 768px) {
          .fullcalendar-dark .fc-daygrid-day-frame {
            min-height: 60px;
          }

          .fullcalendar-dark .fc-daygrid-day-number {
            font-size: 0.75rem;
            padding: 4px;
          }

          .fullcalendar-dark .fc-event {
            font-size: 0.65rem;
            padding: 2px 4px;
            min-height: 20px;
            display: flex;
            align-items: center;
          }

          .fullcalendar-dark .fc-col-header-cell-cushion {
            font-size: 0.65rem;
          }

          .fullcalendar-dark .fc-col-header-cell {
            padding: 8px 0;
          }

          .fullcalendar-dark .fc-timegrid-slot {
            height: 2.5em;
          }

          .fullcalendar-dark .fc-timegrid-slot-label-cushion {
            font-size: 0.6rem;
          }

          .fullcalendar-dark .fc-more-link {
            font-size: 0.65rem;
            padding: 2px;
          }
        }

        @media (max-width: 380px) {
          .fullcalendar-dark .fc-daygrid-day-frame {
            min-height: 50px;
          }

          .fullcalendar-dark .fc-daygrid-day-number {
            font-size: 0.7rem;
            padding: 2px;
          }

          .fullcalendar-dark .fc-event {
            font-size: 0.6rem;
            padding: 1px 2px;
          }

          .fullcalendar-dark .fc-col-header-cell-cushion {
            font-size: 0.6rem;
            letter-spacing: 0;
          }
        }
      `}</style>
    </div>
  );
}
