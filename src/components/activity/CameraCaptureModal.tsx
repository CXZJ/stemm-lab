import { useRef, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";

export function CameraCaptureModal({
  visible,
  mode,
  onClose,
  onCaptured,
}: {
  visible: boolean;
  mode: "photo" | "video";
  onClose: () => void;
  onCaptured: (uri: string, mode: "photo" | "video") => void;
}) {
  const cam = useRef<CameraView>(null);
  const [camPerm, reqCam] = useCameraPermissions();
  const [micPerm, reqMic] = useMicrophonePermissions();
  const [recording, setRecording] = useState(false);
  const recPromise = useRef<Promise<{ uri?: string } | undefined> | null>(null);

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        {!camPerm?.granted ? (
          <View style={styles.center}>
            <StemText variant="body" style={{ color: "#fff", marginBottom: 12 }}>
              Camera permission is needed to record evidence.
            </StemText>
            <StemButton title="Allow camera" onPress={() => reqCam()} />
          </View>
        ) : (
          <>
            <CameraView
              ref={cam}
              style={styles.camera}
              facing="back"
              mode={mode === "video" ? "video" : "picture"}
            />
            <View style={styles.bar}>
              {mode === "photo" ? (
                <StemButton
                  title="Capture photo"
                  onPress={async () => {
                    const p = await cam.current?.takePictureAsync({ quality: 0.85 });
                    if (p?.uri) onCaptured(p.uri, "photo");
                    onClose();
                  }}
                />
              ) : (
                <>
                  {!micPerm?.granted ? (
                    <StemButton title="Allow microphone for video" onPress={() => reqMic()} />
                  ) : !recording ? (
                    <StemButton
                      title="Start recording"
                      onPress={() => {
                        setRecording(true);
                        const p = cam.current?.recordAsync({ maxDuration: 120 });
                        recPromise.current = p ?? null;
                      }}
                    />
                  ) : (
                    <StemButton
                      title="Stop and save"
                      variant="danger"
                      onPress={async () => {
                        try {
                          cam.current?.stopRecording();
                          const v = await recPromise.current;
                          const uri = v && "uri" in v ? v.uri : undefined;
                          if (uri) onCaptured(uri, "video");
                        } finally {
                          setRecording(false);
                          recPromise.current = null;
                          onClose();
                        }
                      }}
                    />
                  )}
                </>
              )}
              <StemButton title="Cancel" variant="ghost" onPress={onClose} />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  bar: { padding: 16, gap: 10 },
  center: { flex: 1, justifyContent: "center", padding: 24 },
});
