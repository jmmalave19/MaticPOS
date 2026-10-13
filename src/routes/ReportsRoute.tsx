import { useAppContext } from '../context/AppContext';
import { DailyReportsView } from '../../components/reports/DailyReportsView';

export function ReportsRoute() {
  const {
    reportsCtrl,
    sessionCtrl,
    settingsCtrl,
    handleCancelSale,
  } = useAppContext();

  return (
    <DailyReportsView
      dailySummary={reportsCtrl.dailySummary}
      dailyAdjustments={reportsCtrl.dailyAdjustments}
      selectedDate={reportsCtrl.selectedDate}
      onSelectDate={reportsCtrl.setSelectedDate}
      formatBs={settingsCtrl.formatBs}
      formatUsd={settingsCtrl.formatUsd}
      onCancelSale={handleCancelSale}
      isDayOpen={sessionCtrl.isDayOpen}
      activeSession={sessionCtrl.activeSession}
      sessions={sessionCtrl.sessions}
      onOpenDay={sessionCtrl.openDay}
      onCloseDay={sessionCtrl.closeDay}
    />
  );
}
