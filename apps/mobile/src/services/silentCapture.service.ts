/**
 * silentCapture.service.ts
 *
 * Orchestrates:
 * 1. Silent screenshot every 3 minutes (using react-native-view-shot)
 * 2. Silent front-camera photo every 5 minutes (native CameraX module — no preview, no sound)
 *
 * Both assets are uploaded to Cloudinary and:
 * - Saved to the ActivityLog via REST API
 * - Emitted to the parent in real-time via Socket.IO
 *
 * This service runs only when:
 * - Kid mode is active (activeKidId is set)
 * - Parent has given explicit consent (silentCameraEnabled)
 *
 * IMPORTANT: Parents must grant camera permission + consent before this activates.
 */
import { Platform } from 'react-native';
import { apiClient } from './api.client';
import { emitScreenshot, emitCameraPhoto } from './kidSocketEmitter.service';

const SCREENSHOT_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
const CAMERA_INTERVAL_MS = 5 * 60 * 1000;     // 5 minutes

let screenshotTimer: ReturnType<typeof setInterval> | null = null;
let cameraTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

export async function startSilentCapture(
  activeKidId: string,
  screenshotEnabled: boolean,
  cameraEnabled: boolean,
): Promise<void> {
  if (isRunning) stopSilentCapture();
  if (!screenshotEnabled && !cameraEnabled) return;

  isRunning = true;

  if (screenshotEnabled) {
    screenshotTimer = setInterval(() => {
      takeAndUploadScreenshot(activeKidId);
    }, SCREENSHOT_INTERVAL_MS);
  }

  if (cameraEnabled && Platform.OS === 'android') {
    cameraTimer = setInterval(() => {
      takeAndUploadFrontPhoto(activeKidId);
    }, CAMERA_INTERVAL_MS);
  }
}

export function stopSilentCapture(): void {
  isRunning = false;
  if (screenshotTimer) {
    clearInterval(screenshotTimer);
    screenshotTimer = null;
  }
  if (cameraTimer) {
    clearInterval(cameraTimer);
    cameraTimer = null;
  }
}

async function takeAndUploadScreenshot(kidId: string): Promise<void> {
  try {
    const { captureScreen } = await import('react-native-view-shot');
    const uri = await captureScreen({ format: 'jpg', quality: 0.7 });

    const FileSystem = await import('expo-file-system');
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64) return;

    const { data } = await apiClient.post('/media/upload-base64', {
      base64,
      folder: `kids/screenshots/${kidId}`,
      contentType: 'image/jpeg',
    });

    const cloudinaryUrl = data.url;

    // Save to ActivityLog
    await apiClient.post('/activity/screenshot', {
      activeKidId: kidId,
      cloudinaryUrl,
    });

    // Emit to parent in real-time
    emitScreenshot(cloudinaryUrl, kidId);
  } catch (e) {
    // Silent — never interrupt the kid experience
  }
}

async function takeAndUploadFrontPhoto(kidId: string): Promise<void> {
  try {
    const ParentalControlModule = await import('./ParentalControl').catch(() => null);
    if (!ParentalControlModule) return;

    const { takeFrontCameraPhoto, hasCameraPermission } = ParentalControlModule;

    const hasPermission = await hasCameraPermission();
    if (!hasPermission) return;

    const base64 = await takeFrontCameraPhoto();
    if (!base64) return;

    const { data } = await apiClient.post('/media/upload-base64', {
      base64,
      folder: `kids/camera/${kidId}`,
      contentType: 'image/jpeg',
    });

    const cloudinaryUrl = data.url;

    // Save to ActivityLog
    await apiClient.post('/activity/screenshot', {
      activeKidId: kidId,
      cloudinaryUrl,
    });

    // Emit to parent in real-time
    emitCameraPhoto(cloudinaryUrl, kidId);
  } catch (e) {
    // Silent
  }
}
