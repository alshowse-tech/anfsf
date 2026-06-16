import { Alert, AlertType, AlertSeverity, AlertStatus } from "../entity/Alert";

export class AlertService {
  checkForOverdueProjects(): Alert[] {
    const alerts: Alert[] = [];
    return alerts;
  }

  checkForOverBudgetProjects(): Alert[] {
    const alerts: Alert[] = [];
    return alerts;
  }

  createAlert(
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    description?: string,
    projectId?: string,
    thresholdValue?: number,
    currentValue?: number
  ): Alert {
    const alert = new Alert();
    alert.alertType = type;
    alert.severity = severity;
    alert.title = title;
    alert.description = description;
    alert.projectId = projectId;
    alert.thresholdValue = thresholdValue;
    alert.currentValue = currentValue;
    alert.status = "active";
    return alert;
  }
}