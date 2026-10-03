import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, FileText, FileDown, CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { MONTHS, getAvailableYears } from '@/constants/months';
import { toLocalDateStr } from '@/utils/dateRange';
import { buildPeriodRange, defaultClosedMonthsRange } from '@/utils/reportPeriod';
import { buildMonthlyAccounting, computeFinancialStats, groupExpensesByCategory } from '@/utils/accountingStats';
import { exportAccountingToCSV, exportAccountingToExcel, exportAccountingToPDF } from '@/utils/accountingExport';

const fetchAll = async (makeQuery) => {
  const pageSize = 1000;
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
    from += pageSize;
  }
};

const MonthYearSelect = ({ month, year, onMonth, onYear, years }) => (
  <div className="flex gap-2">
    <Select value={month} onValueChange={onMonth}>
      <SelectTrigger className="w-36"><SelectValue placeholder="Mois" /></SelectTrigger>
      <SelectContent>
        {MONTHS.map((item) => (
          <SelectItem key={item.value} value={String(parseInt(item.value, 10) - 1)}>{item.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={year} onValueChange={onYear}>
      <SelectTrigger className="w-24"><SelectValue placeholder="Année" /></SelectTrigger>
      <SelectContent>
        {years.map((item) => (
          <SelectItem key={item} value={item}>{item}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const PeriodExportDialog = () => {
  const preset = useMemo(() => defaultClosedMonthsRange(), []);
  const years = useMemo(() => getAvailableYears(), []);
  const [open, setOpen] = useState(false);
  const [startMonth, setStartMonth] = useState(String(preset.startMonth));
  const [startYear, setStartYear] = useState(String(preset.startYear));
  const [endMonth, setEndMonth] = useState(String(preset.endMonth));
  const [endYear, setEndYear] = useState(String(preset.endYear));
  const [busy, setBusy] = useState(false);

  const range = buildPeriodRange(
    parseInt(startMonth, 10),
    parseInt(startYear, 10),
    parseInt(endMonth, 10),
    parseInt(endYear, 10),
  );

  const loadPeriod = async () => {
    if (!range.valid) throw new Error(range.error);
    const startIso = range.startDate.toISOString();
    const endIso = range.endDate.toISOString();
    const startDateStr = toLocalDateStr(range.startDate);
    const endDateStr = toLocalDateStr(range.endDate);

    const [invoices, expenses, plannedIncome] = await Promise.all([
      fetchAll(() => supabase
        .from('invoices')
        .select('*')
        .eq('status', 'paid')
        .gte('last_status_change', startIso)
        .lte('last_status_change', endIso)
        .order('last_status_change', { ascending: true })),
      fetchAll(() => supabase
        .from('expenses')
        .select('*, expense_categories(name, color, icon)')
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr)
        .order('expense_date', { ascending: true })),
      fetchAll(() => supabase
        .from('planned_income')
        .select('*')
        .gte('due_date', startDateStr)
        .lte('due_date', endDateStr)
        .order('due_date', { ascending: true })),
    ]);

    const stats = computeFinancialStats(invoices, expenses, plannedIncome);
    const { rows } = buildMonthlyAccounting(invoices, expenses, plannedIncome, range.months);
    return {
      invoices,
      expenses,
      plannedIncome,
      stats,
      expensesByCategory: groupExpensesByCategory(expenses),
      monthlyRows: rows,
    };
  };

  const runExport = async (kind) => {
    if (!range.valid) {
      toast.error(range.error);
      return;
    }
    setBusy(true);
    try {
      const data = await loadPeriod();
      if (kind === 'excel') await exportAccountingToExcel(data, range.label);
      else if (kind === 'pdf') exportAccountingToPDF(data, range.label);
      else exportAccountingToCSV(data, range.label);
      toast.success(`Document téléchargé : ${range.label}`);
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de générer le rapport de la période");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1 text-xs">
          <CalendarRange className="h-4 w-4" />
          <span className="hidden sm:inline">Période</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Un seul document sur plusieurs mois</DialogTitle>
          <DialogDescription>
            {range.valid
              ? `Le fichier couvre ${range.label} : synthèse, détail mensuel, ventes et dépenses.`
              : range.error}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Du</p>
            <MonthYearSelect
              month={startMonth}
              year={startYear}
              onMonth={setStartMonth}
              onYear={setStartYear}
              years={years}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Au</p>
            <MonthYearSelect
              month={endMonth}
              year={endYear}
              onMonth={setEndMonth}
              onYear={setEndYear}
              years={years}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setStartMonth(String(preset.startMonth));
              setStartYear(String(preset.startYear));
              setEndMonth(String(preset.endMonth));
              setEndYear(String(preset.endYear));
            }}
          >
            {buildPeriodRange(preset.startMonth, preset.startYear, preset.endMonth, preset.endYear).label}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" size="sm" disabled={busy || !range.valid} onClick={() => runExport('excel')}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button size="sm" disabled={busy || !range.valid} onClick={() => runExport('pdf')}>
            <FileText className="h-4 w-4 mr-1" /> {busy ? 'Préparation…' : 'PDF'}
          </Button>
          <Button variant="outline" size="sm" disabled={busy || !range.valid} onClick={() => runExport('csv')}>
            <FileDown className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PeriodExportDialog;
