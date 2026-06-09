import { Screen } from "@/components/ui/Screen";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import { resendVerificationEmail } from "@/services/firebase/authService";
import { useAuthStore } from "@/store/authStore";
import { getAuth } from "firebase/auth";
import { useState } from "react";

export default function VerifyEmailScreen() {
  const { signOut } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const checkVerificationStatus = async () => {
  setLoading(true);
  try {
    const authInstance = getAuth(); 
    if (authInstance.currentUser) {
      // 1. Reload the user to get fresh data from server
      await authInstance.currentUser.reload();
      
      // 2. Explicitly update your Zustand store with the fresh user
      // This forces a re-render and triggers the _layout.tsx logic
      useAuthStore.setState({ firebaseUser: authInstance.currentUser });
      
      console.log("Verified status:", authInstance.currentUser.emailVerified);
    }
  } catch (e) {
    setMessage("Failed to refresh status.");
  } finally {
    setLoading(false);
  }
};

  const handleResend = async () => {
    try {
      await resendVerificationEmail();
      setMessage("Verification email resent! Check your inbox.");
    } catch (e) {
      setMessage("Failed to resend email. Please try again later.");
    }
  };

  return (
    <Screen contentStyle={{ padding: 20, justifyContent: "center", gap: 16 }}>
    <StemText variant="h1">Verify Your Email</StemText>
      <StemText variant="body">
        We sent a confirmation link to your email address. Please click the link in that email to activate your account.
      </StemText>

      {message && <StemText variant="small" style={{ color: "orange" }}>{message}</StemText>}

      <StemButton 
        title={loading ? "Checking..." : "I've Verified My Email"} 
        onPress={checkVerificationStatus} 
      />

      <StemButton 
        title="Resend Email" 
        variant="secondary" 
        onPress={handleResend} 
      />

      <StemButton 
        title="Cancel & Sign Out" 
        variant="ghost" 
        onPress={async () => {
            try {
            console.log("Sign out triggered...");
            await signOut();
            console.log("Sign out process complete.");
            } catch (e) {
            console.error("Sign out error in UI:", e);
            }
        }} 
        />
    </Screen>
  );
}