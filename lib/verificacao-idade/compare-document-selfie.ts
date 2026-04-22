import { CompareFacesCommand, RekognitionClient } from "@aws-sdk/client-rekognition";

export type CompareDocumentSelfieResult = {
  approved: boolean;
  similarity: number;
  provider: "aws_rekognition" | "simulated";
  details: Record<string, unknown>;
};

const MIN_SIMILARITY = 85;

function resolveMode(): "rekognition" | "simulated" {
  const raw = (process.env.IDADE_VERIFY_MODE ?? "").trim().toLowerCase();
  if (raw === "rekognition" || raw === "simulated") return raw;
  return process.env.NODE_ENV === "development" ? "simulated" : "rekognition";
}

/**
 * Compara rosto na selfie (source) com rosto no documento (target), via AWS Rekognition.
 * Em desenvolvimento, sem IDADE_VERIFY_MODE=rekognition, usa modo simulado (não usar em produção sem revisão).
 */
export async function compareDocumentSelfie(
  selfieBytes: Buffer,
  documentBytes: Buffer
): Promise<CompareDocumentSelfieResult> {
  const mode = resolveMode();

  if (mode === "simulated") {
    const simApprove = process.env.IDADE_VERIFY_SIMULATED_APPROVE !== "false";
    const similarity = simApprove ? 92.4 : 72.1;
    return {
      approved: simApprove,
      similarity,
      provider: "simulated",
      details: {
        note:
          "Modo simulado. Em produção use IDADE_VERIFY_MODE=rekognition e credenciais AWS (CompareFaces).",
      },
    };
  }

  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
  const key = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !key || !secret) {
    throw new Error("IDADE_VERIFY_MODE=rekognition exige AWS_REGION, AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY.");
  }

  const client = new RekognitionClient({ region });
  const out = await client.send(
    new CompareFacesCommand({
      SourceImage: { Bytes: selfieBytes },
      TargetImage: { Bytes: documentBytes },
      SimilarityThreshold: MIN_SIMILARITY - 5,
    })
  );

  const best = out.FaceMatches?.reduce((m, f) => Math.max(m, f.Similarity ?? 0), 0) ?? 0;
  const approved = best >= MIN_SIMILARITY;
  return {
    approved,
    similarity: Math.round(best * 100) / 100,
    provider: "aws_rekognition",
    details: {
      unmatchedFaces: out.UnmatchedFaces?.length ?? 0,
      sourceFaceConfidence: out.SourceImageFace?.Confidence,
    },
  };
}
