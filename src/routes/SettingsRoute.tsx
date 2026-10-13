import { useAppContext } from '../context/AppContext';
import { SettingsView } from '../../components/settings/SettingsView';

export function SettingsRoute() {
  const {
    settingsCtrl,
    handleDataRestored,
  } = useAppContext();

  return (
    <SettingsView
      settings={settingsCtrl.settings}
      isSyncingRate={settingsCtrl.isSyncingRate}
      onUpdateExchangeRate={settingsCtrl.updateExchangeRate}
      onSetExchangeRateMode={settingsCtrl.setExchangeRateMode}
      onSyncOfficialRate={settingsCtrl.syncOfficialRate}
      onUpdateCommission={settingsCtrl.updateCommission}
      onDataRestored={handleDataRestored}
      formatBs={settingsCtrl.formatBs}
    />
  );
}
