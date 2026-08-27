export type FileType = "image" | "json" | "tabular" | "text";

const MIME_PREFIXES: Record<FileType, string> = {
  image: "image/",
  json: "application/json",
  tabular: "text/csv",
  text: "text/plain",
};

const EXTENSIONS: Record<FileType, string[]> = {
  image: [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
    ".avif",
  ],
  json: [".json"],
  tabular: [".csv"],
  text: [".txt"],
};

/**
 * Keeps the files of the given type.
 *
 * Used to filter a folder that has been dropped
 * (file type is not checked automatically in this case)
 */
export function matching(files: Iterable<File>, type: FileType): File[] {
  return Array.from(files).filter((file) => {
    // hidden files, such as the .DS_Store macOS adds to every folder
    if (file.name.startsWith(".")) return false;

    if (file.type.startsWith(MIME_PREFIXES[type])) return true;

    // browsers don't always know the type of a file, fall back to its extension
    const dot = file.name.lastIndexOf(".");
    if (dot === -1) return false;
    return EXTENSIONS[type].includes(file.name.slice(dot).toLowerCase());
  });
}

/**
 * The files of the wanted type dropped on a field, folders expanded into the
 * files they contain.
 */
export async function dropped(
  dataTransfer: DataTransfer,
  type: FileType,
): Promise<{ files: File[]; ignored: number }> {
  // dataTransfer is only readable while handling the event, get the entries
  // before awaiting anything
  const entries = Array.from(dataTransfer.items, (item) =>
    item.webkitGetAsEntry(),
  ).filter((entry) => entry !== null);

  const all: File[] = [];
  if (entries.length === 0)
    // nothing was dropped as an entry, e.g. text or an unsupported browser
    all.push(...dataTransfer.files);
  else
    for (const entry of entries)
      if (isFile(entry)) all.push(await fileOf(entry));
      else if (isDirectory(entry)) all.push(...(await filesIn(entry)));

  const files = matching(all, type);
  return { files, ignored: all.length - files.length };
}

async function filesIn(directory: FileSystemDirectoryEntry): Promise<File[]> {
  const files: File[] = [];

  for (const entry of await entriesIn(directory))
    if (isFile(entry)) files.push(await fileOf(entry));
    else if (isDirectory(entry)) files.push(...(await filesIn(entry)));

  return files;
}

async function entriesIn(
  directory: FileSystemDirectoryEntry,
): Promise<FileSystemEntry[]> {
  const reader = directory.createReader();

  // a reader only returns a batch of entries at a time, at most 100 on Chrome,
  // and an empty one once the whole directory has been read
  const entries: FileSystemEntry[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (batch.length === 0) return entries;

    entries.push(...batch);
  }
}

function fileOf(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

// TS type guard
function isFile(entry: FileSystemEntry): entry is FileSystemFileEntry {
  return entry.isFile;
}

// TS type guard
function isDirectory(
  entry: FileSystemEntry,
): entry is FileSystemDirectoryEntry {
  return entry.isDirectory;
}
