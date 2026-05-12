"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";

import type { Appointment } from "@/types/appointments";
import IntegrationStatusBanner from "./IntegrationStatusBanner";
import NewAppointmentModal from "./NewAppointmentModal";
import EventDetailModal from "./EventDetailModal";

// ─── View type ────────────────────────────────────────────────────────────────

type CalView = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

const VIEW_LABELS: Record<CalView, string> = {
  dayGridMonth: "Mês",
  timeGridWeek: "Semana",
  timeGridDay:  "Dia",
};

// ─── Event colors by type ─────────────────────────────────────────────────────

const TYPE_BG: Record<string, string> = {
  visita:   "#465fff",
  reuniao:  "#8b5cf6",
  retorno:  "#f59e0b",
  consulta: "#14b8a6",
  outro:    "#6b7280",
};

function toCalEvent(a: Appointment): EventInput {
  return {
    id:              a.id,
    title:           a.title,
    start:           a.start_at,
    end:             a.end_at ?? undefined,
    backgroundColor: TYPE_BG[a.appointment_type] ?? TYPE_BG.outro,
    borderColor:     "transparent",
    textColor:       "#ffffff",
    extendedProps:   { appointment: a },
  };
}

// ─── Shared button styles ─────────────────────────────────────────────────────

const iconBtnCls =
  "rounded-lg p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors";

const switchBtnCls = (active: boolean) =>
  `rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
  }`;

// ─── CalendarioClient ─────────────────────────────────────────────────────────

export default function CalendarioClient() {
  const calRef = useRef<FullCalendar>(null);

  // Guard against SSR — FullCalendar needs the DOM
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [view, setView]             = useState<CalView>("dayGridMonth");
  const [calTitle, setCalTitle]     = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // New-appointment modal
  const [isNewOpen, setIsNewOpen]     = useState(false);
  const [defaultStart, setDefaultStart] = useState<string | undefined>();

  // Event-detail modal
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const refetch = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res  = await fetch("/api/appointments");
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setFetchError(json.error ?? "Erro ao buscar compromissos.");
        setAppointments([]);
        return;
      }
      setAppointments(json.appointments ?? []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Erro inesperado.");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  // ── Calendar navigation helpers ────────────────────────────────────────────

  function syncTitle() {
    const api = calRef.current?.getApi();
    if (api) setCalTitle(api.view.title);
  }

  function changeView(v: CalView) {
    setView(v);
    const api = calRef.current?.getApi();
    if (api) { api.changeView(v); setCalTitle(api.view.title); }
  }

  function prev()      { calRef.current?.getApi().prev();   syncTitle(); }
  function next()      { calRef.current?.getApi().next();   syncTitle(); }
  function gotoToday() { calRef.current?.getApi().today();  syncTitle(); }

  // ── FullCalendar event handlers ────────────────────────────────────────────

  function handleDateClick(arg: DateClickArg) {
    // Convert to "YYYY-MM-DDTHH:mm" for datetime-local input
    const startLocal = arg.dateStr.includes("T")
      ? arg.dateStr.slice(0, 16)
      : `${arg.dateStr}T09:00`;
    setDefaultStart(startLocal);
    setIsNewOpen(true);
  }

  function handleEventClick(arg: EventClickArg) {
    const appt = arg.event.extendedProps.appointment as Appointment;
    setDetailAppt(appt);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Calendário operacional
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Compromissos da equipe
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setDefaultStart(undefined); setIsNewOpen(true); }}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 active:scale-95 transition-all"
        >
          <span aria-hidden="true">+</span>
          Novo compromisso
        </button>
      </div>

      {/* Calendar toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Prev / Today / Next */}
        <div className="flex items-center gap-1">
          <button type="button" onClick={prev} className={iconBtnCls} title="Anterior">
            <svg className="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={gotoToday}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            Hoje
          </button>
          <button type="button" onClick={next} className={iconBtnCls} title="Próximo">
            <svg className="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Period title */}
        <p className="flex-1 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[120px]">
          {calTitle}
        </p>

        {/* View switcher */}
        <div className="flex items-center gap-0.5 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
          {(["dayGridMonth", "timeGridWeek", "timeGridDay"] as CalView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => changeView(v)}
              className={switchBtnCls(view === v)}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {/* Integration banner */}
      <IntegrationStatusBanner provider={null} status="pendente" />

      {/* Calendar */}
      <div className="yzi-calendar rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        {!mounted || loading ? (
          <div className="flex h-[520px] items-center justify-center">
            <span className="inline-block size-7 rounded-full border-2 border-gray-200 border-t-brand-500 animate-spin" />
          </div>
        ) : (
          <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={view}
            locale={ptBrLocale}
            headerToolbar={false}
            height="auto"
            firstDay={0}
            editable={false}
            selectable={false}
            events={appointments.map(toCalEvent)}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            datesSet={syncTitle}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false }}
            dayMaxEvents={3}
            nowIndicator
          />
        )}
      </div>

      {/* Fetch error */}
      {fetchError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/5 px-4 py-3">
          <p className="text-sm text-rose-600 dark:text-rose-400">{fetchError}</p>
        </div>
      )}

      {/* Modals */}
      <NewAppointmentModal
        isOpen={isNewOpen}
        defaultStartAt={defaultStart}
        onClose={() => setIsNewOpen(false)}
        onCreated={() => { setIsNewOpen(false); refetch(); }}
      />

      {detailAppt && (
        <EventDetailModal
          appointment={detailAppt}
          onClose={() => setDetailAppt(null)}
        />
      )}

    </div>
  );
}
