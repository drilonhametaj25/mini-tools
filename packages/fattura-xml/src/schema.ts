import { z } from "zod";

export const CedenteSchema = z.object({
  denominazione: z.string().optional(),
  nome: z.string().optional(),
  cognome: z.string().optional(),
  partitaIva: z.string().optional(),
  codiceFiscale: z.string().optional(),
  paese: z.string(),
  indirizzo: z.string().optional(),
  cap: z.string().optional(),
  comune: z.string().optional(),
  provincia: z.string().optional(),
  regimeFiscale: z.string().optional(),
});

export const CessionarioSchema = z.object({
  denominazione: z.string().optional(),
  nome: z.string().optional(),
  cognome: z.string().optional(),
  partitaIva: z.string().optional(),
  codiceFiscale: z.string().optional(),
  paese: z.string().optional(),
  indirizzo: z.string().optional(),
  cap: z.string().optional(),
  comune: z.string().optional(),
  provincia: z.string().optional(),
});

export const DocumentoSchema = z.object({
  tipo: z.string(), // TD01, TD02, ecc.
  numero: z.string(),
  data: z.string(), // ISO YYYY-MM-DD
  divisa: z.string().default("EUR"),
  importoTotaleDocumento: z.number().optional(),
  causale: z.string().optional(),
});

export const RigaSchema = z.object({
  numeroLinea: z.number(),
  descrizione: z.string(),
  quantita: z.number().optional(),
  unitaMisura: z.string().optional(),
  prezzoUnitario: z.number().optional(),
  scontoMaggiorazionePercentuale: z.number().optional(),
  prezzoTotale: z.number(),
  aliquotaIva: z.number(),
  natura: z.string().optional(),
});

export const RiepilogoIvaSchema = z.object({
  aliquotaIva: z.number(),
  imponibileImporto: z.number(),
  imposta: z.number(),
  natura: z.string().optional(),
  esigibilitaIva: z.string().optional(),
});

export const FatturaSchema = z.object({
  versione: z.string(),
  cedente: CedenteSchema,
  cessionario: CessionarioSchema,
  documento: DocumentoSchema,
  righe: z.array(RigaSchema),
  riepilogoIva: z.array(RiepilogoIvaSchema),
  totaleImponibile: z.number(),
  totaleImposta: z.number(),
  totaleDocumento: z.number(),
});

export type Cedente = z.infer<typeof CedenteSchema>;
export type Cessionario = z.infer<typeof CessionarioSchema>;
export type Documento = z.infer<typeof DocumentoSchema>;
export type Riga = z.infer<typeof RigaSchema>;
export type RiepilogoIva = z.infer<typeof RiepilogoIvaSchema>;
export type Fattura = z.infer<typeof FatturaSchema>;
