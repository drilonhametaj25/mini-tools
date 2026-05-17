export interface BankMovement {
  id: string;
  date: string;
  importo: number; // positivo entrata, negativo uscita
  causale: string;
  saldo?: number;
}

export interface Invoice {
  id: string;
  date: string;
  scadenza?: string;
  controparte: string;
  controparte_piva?: string;
  numero: string;
  importo: number; // positivo per fatture attive (incasso), negativo per passive (pagamento)
  direzione: "attiva" | "passiva";
}

export interface MatchSuggestion {
  movementId: string;
  invoiceId: string;
  score: number; // 0..1
  reason: string;
  exact: boolean;
}

export interface Reconciliation {
  movementId: string;
  invoiceId: string;
  acceptedAt: string;
  reason: string;
}
