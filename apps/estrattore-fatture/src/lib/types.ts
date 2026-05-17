import type { Fattura } from "@mini-tools/fattura-xml";

export type ExtractionSource = "xml" | "pdf-native";

export interface ExtractedDocument {
  filename: string;
  source: ExtractionSource;
  fattura: Fattura;
  warnings: string[];
}
