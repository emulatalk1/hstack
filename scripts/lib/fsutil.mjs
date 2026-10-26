import fs from 'node:fs';

// statSync's throwIfNoEntry covers ENOENT only; a path below a file gives ENOTDIR.
export function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

// Anything at the path counts (file, folder, odd entry). Only "nothing is there" returns false, so other stat errors refuse.
export function exists(p) {
  try {
    fs.statSync(p);
    return true;
  } catch (err) {
    return err.code !== 'ENOENT' && err.code !== 'ENOTDIR';
  }
}
