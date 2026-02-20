export interface AlertMessage {
  readonly eventId: string;
  readonly data: Readonly<{
    threatId: string;
    type: string;
    severity: string;
    sourceIp: string;
    description: string;
  }>;
  readonly timestamp?: number;
}
