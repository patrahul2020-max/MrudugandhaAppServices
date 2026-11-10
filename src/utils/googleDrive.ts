/**
 * Google Drive Integration for Mrudugandha Guesthouse
 * Handles client-side OAuth token retrieval via Firebase Auth and Google Drive REST API v3 operations.
 * Organizes files into client-specific folders inside the parent folder "clients documents".
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse existing Firebase app or initialize a new one safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory token caching (NOT in localStorage per security discipline)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;
let isSigningIn = false;

// Parent folder constant requested by user
export const PARENT_FOLDER_NAME = 'clients documents';
export const TARGET_DRIVE_ACCOUNT = 'rahulvasumindrive@gmail.com';

/**
 * Listener for auth state changes
 */
export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedGoogleUser = user;
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

/**
 * Sign in with Google to get Drive access token
 */
export const signInWithGoogleDrive = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    // Set hint for user's drive email if available
    provider.setCustomParameters({
      login_hint: TARGET_DRIVE_ACCOUNT,
      prompt: 'select_account',
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google.');
    }

    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns current access token or prompts sign-in if missing
 */
export const getDriveAccessToken = async (promptIfMissing = true): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  if (!promptIfMissing) return null;

  const res = await signInWithGoogleDrive();
  return res ? res.accessToken : null;
};

export const getGoogleUser = (): User | null => cachedGoogleUser;

export const logoutGoogleDrive = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedGoogleUser = null;
};

/**
 * Searches for a folder by name inside an optional parent folder.
 * Returns the folder ID if found, or null.
 */
async function findFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string | null> {
  const cleanName = folderName.replace(/'/g, "\\'");
  let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${cleanName}' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name)&spaces=drive&pageSize=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.warn('Drive findFolder error:', errText);
    return null;
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Creates a folder inside an optional parent folder.
 */
async function createFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string> {
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create folder "${folderName}": ${errorBody}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Ensures a folder exists: finds existing or creates new.
 */
async function getOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string> {
  const existingId = await findFolder(accessToken, folderName, parentId);
  if (existingId) return existingId;
  return await createFolder(accessToken, folderName, parentId);
}

/**
 * Uploads a file (PDF or image) to Google Drive inside a target folder using Multipart Upload.
 */
async function uploadMultipartFile(
  accessToken: string,
  options: {
    filename: string;
    mimeType: string;
    blob: Blob;
    folderId: string;
  }
): Promise<{ fileId: string; webViewLink?: string }> {
  const { filename, mimeType, blob, folderId } = options;

  const metadata = {
    name: filename,
    parents: [folderId],
  };

  const boundary = `-------mrudugandha_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}`;

  const mediaHeader = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`;

  // Combine into a single multipart request body
  const multipartBlob = new Blob(
    [metadataPart, mediaHeader, blob, closeDelimiter],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const uploadUrl =
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink';

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBlob,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to upload file to Google Drive: ${errText}`);
  }

  const result = await response.json();
  return {
    fileId: result.id,
    webViewLink: result.webViewLink,
  };
}

/**
 * Main Google Drive dispatch function:
 * Ensures the parent folder "clients documents" exists.
 * Ensures the client-specific folder (e.g. "Rahul Patil") exists inside "clients documents".
 * Uploads the document directly into the client's folder.
 */
export async function uploadToClientDriveFolder(options: {
  filename: string;
  mimeType: string;
  blob: Blob;
  clientName: string;
}): Promise<{
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  clientFolder: string;
  parentFolder: string;
  error?: string;
}> {
  const { filename, mimeType, blob, clientName } = options;

  const cleanClient = (clientName || 'General Client').trim() || 'General Client';

  // 1. Get or prompt Google access token
  const token = await getDriveAccessToken(true);
  if (!token) {
    return {
      success: false,
      clientFolder: cleanClient,
      parentFolder: PARENT_FOLDER_NAME,
      error: 'Google Drive authorization is required to upload.',
    };
  }

  try {
    // 2. Ensure parent folder "clients documents" exists
    const parentFolderId = await getOrCreateFolder(token, PARENT_FOLDER_NAME);

    // 3. Ensure client-specific folder exists inside "clients documents"
    const clientFolderId = await getOrCreateFolder(token, cleanClient, parentFolderId);

    // 4. Upload file into client-specific folder
    const uploadResult = await uploadMultipartFile(token, {
      filename,
      mimeType,
      blob,
      folderId: clientFolderId,
    });

    return {
      success: true,
      fileId: uploadResult.fileId,
      webViewLink: uploadResult.webViewLink,
      clientFolder: cleanClient,
      parentFolder: PARENT_FOLDER_NAME,
    };
  } catch (err: any) {
    console.error('Google Drive folder upload error:', err);
    return {
      success: false,
      clientFolder: cleanClient,
      parentFolder: PARENT_FOLDER_NAME,
      error: err.message || 'Failed to upload document to Google Drive',
    };
  }
}
