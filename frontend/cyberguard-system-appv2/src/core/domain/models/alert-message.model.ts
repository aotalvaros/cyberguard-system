export interface AlertMessage {
  eventId: string;
  data: {
    threatId: string;
    type: string;
    severity: string;
    sourceIp: string;
    description: string;
  };
  timestamp?: number;
}
