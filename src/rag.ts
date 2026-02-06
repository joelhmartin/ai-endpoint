import { Request, Response } from "express";
import multer from "multer";
import { Storage } from "@google-cloud/storage";
import { env } from "./env";
import {
  createRagCorpus,
  deleteRagCorpus,
  importRagFile,
  listRagFiles,
  deleteRagFile,
} from "./ragApi";
import {
  getCorpus,
  hasCorpus,
  setCorpus,
  removeCorpus,
} from "./ragCorpusStore";
import {
  CreateCorpusRequest,
  DeleteCorpusRequest,
  DeleteFileRequest,
} from "./ragTypes";

// ── Auth helper ─────────────────────────────────────────────────────

function extractToken(req: Request): string {
  return (
    (req.body && req.body.token) ||
    (req.query.token as string) ||
    (req.headers["x-forward-token"] as string) ||
    ""
  );
}

function checkAuth(req: Request, res: Response): boolean {
  if (extractToken(req) !== env.FORWARD_TOKEN) {
    res.status(403).json({ error: "Invalid token" });
    return false;
  }
  return true;
}

// ── Multer config ───────────────────────────────────────────────────

const ALLOWED_MIMES = [
  "application/pdf",
  "text/plain",
  "text/html",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// ── GCS client ──────────────────────────────────────────────────────

const storage = new Storage();
const bucket = storage.bucket(env.RAG_GCS_BUCKET);

async function uploadToGCS(
  buffer: Buffer,
  originalName: string,
  clientId: string
): Promise<string> {
  const dest = `${clientId}/${Date.now()}_${originalName}`;
  const file = bucket.file(dest);
  await file.save(buffer, { resumable: false });
  return `gs://${env.RAG_GCS_BUCKET}/${dest}`;
}

// ── Route handlers ──────────────────────────────────────────────────

export async function handleCreateCorpus(req: Request, res: Response) {
  if (!checkAuth(req, res)) return;

  const { clientId, name } = req.body as CreateCorpusRequest;
  if (!clientId || !name) {
    return res.status(400).json({ error: "Missing clientId or name" });
  }

  if (hasCorpus(clientId)) {
    return res.status(409).json({ error: "Corpus already exists for this client" });
  }

  try {
    const displayName = `client_${clientId}_${name.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 60)}`;
    const corpusName = await createRagCorpus(displayName, `Knowledge base for client ${clientId}`);
    setCorpus(clientId, { corpusName, displayName });
    const corpusId = corpusName.split("/").pop();
    console.log(`[RAG] Created corpus for client ${clientId}: ${corpusId}`);
    res.json({ status: "created", corpusId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[RAG] createCorpus error for ${clientId}:`, msg);
    res.status(500).json({ error: "Failed to create corpus" });
  }
}

export async function handleDeleteCorpus(req: Request, res: Response) {
  if (!checkAuth(req, res)) return;

  const { clientId } = req.body as DeleteCorpusRequest;
  if (!clientId) {
    return res.status(400).json({ error: "Missing clientId" });
  }

  const corpus = getCorpus(clientId);
  if (!corpus) {
    return res.status(404).json({ error: "No corpus for this client" });
  }

  try {
    await deleteRagCorpus(corpus.corpusName);
    removeCorpus(clientId);
    console.log(`[RAG] Deleted corpus for client ${clientId}`);
    res.json({ status: "deleted" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[RAG] deleteCorpus error for ${clientId}:`, msg);
    res.status(500).json({ error: "Failed to delete corpus" });
  }
}

export async function handleUploadFile(req: Request, res: Response) {
  if (!checkAuth(req, res)) return;

  const clientId = req.body?.clientId as string;
  if (!clientId) {
    return res.status(400).json({ error: "Missing clientId" });
  }

  const corpus = getCorpus(clientId);
  if (!corpus) {
    return res.status(404).json({ error: "No corpus for this client. Create one first." });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const gcsUri = await uploadToGCS(req.file.buffer, req.file.originalname, clientId);
    console.log(`[RAG] Uploaded to GCS: ${gcsUri}`);

    const ragFile = await importRagFile(corpus.corpusName, gcsUri);
    console.log(`[RAG] Imported file for client ${clientId}: ${ragFile.name}`);

    res.json({
      status: "imported",
      ragFileName: ragFile.name,
      displayName: ragFile.displayName,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[RAG] uploadFile error for ${clientId}:`, msg);
    res.status(500).json({ error: "Failed to upload/import file" });
  }
}

export async function handleListFiles(req: Request, res: Response) {
  if (!checkAuth(req, res)) return;

  const clientId = req.query.clientId as string;
  if (!clientId) {
    return res.status(400).json({ error: "Missing clientId" });
  }

  const corpus = getCorpus(clientId);
  if (!corpus) {
    return res.status(404).json({ error: "No corpus for this client" });
  }

  try {
    const files = await listRagFiles(corpus.corpusName);
    res.json({
      files: files.map((f) => ({
        ragFileName: f.name,
        displayName: f.displayName,
        sizeBytes: f.sizeBytes,
        createTime: f.createTime,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[RAG] listFiles error for ${clientId}:`, msg);
    res.status(500).json({ error: "Failed to list files" });
  }
}

export async function handleDeleteFile(req: Request, res: Response) {
  if (!checkAuth(req, res)) return;

  const { clientId, ragFileName } = req.body as DeleteFileRequest;
  if (!clientId || !ragFileName) {
    return res.status(400).json({ error: "Missing clientId or ragFileName" });
  }

  const corpus = getCorpus(clientId);
  if (!corpus) {
    return res.status(404).json({ error: "No corpus for this client" });
  }

  try {
    await deleteRagFile(ragFileName);
    console.log(`[RAG] Deleted file ${ragFileName} for client ${clientId}`);
    res.json({ status: "deleted" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[RAG] deleteFile error for ${clientId}:`, msg);
    res.status(500).json({ error: "Failed to delete file" });
  }
}

export async function handleRagStatus(req: Request, res: Response) {
  if (!checkAuth(req, res)) return;

  const clientId = req.query.clientId as string;
  if (!clientId) {
    return res.status(400).json({ error: "Missing clientId" });
  }

  const corpus = getCorpus(clientId);
  res.json({
    enabled: !!corpus,
    corpusId: corpus ? corpus.corpusName.split("/").pop() : null,
  });
}
