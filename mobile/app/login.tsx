import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/AuthContext";
import { BrandName } from "@/components/brand";
import {
  FormField,
  FormPanel,
  formControlStyle,
  primaryButtonStyle,
  primaryButtonTextStyle,
} from "@/components/forms";
import { colors } from "@/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.brandCorner}>
        <BrandName hero />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <FormPanel
          title="User Login"
          footerMessage={error}
          footer={
            <Pressable
              style={[
                primaryButtonStyle,
                (submitting || !username.trim() || !password) &&
                  styles.buttonDisabled,
              ]}
              onPress={() => {
                void onSubmit();
              }}
              disabled={submitting || !username.trim() || !password}
            >
              {submitting ? (
                <ActivityIndicator color={colors.accentContrast} />
              ) : (
                <Text style={primaryButtonTextStyle}>Login</Text>
              )}
            </Pressable>
          }
        >
          <FormField label="Username">
            <TextInput
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              style={formControlStyle}
              placeholderTextColor={colors.muted}
              editable={!submitting}
              returnKeyType="next"
            />
          </FormField>
          <FormField label="Password">
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              style={formControlStyle}
              placeholderTextColor={colors.muted}
              editable={!submitting}
              returnKeyType="go"
              onSubmitEditing={() => {
                void onSubmit();
              }}
            />
          </FormField>
        </FormPanel>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  brandCorner: {
    position: "absolute",
    top: Platform.OS === "android" ? 48 : 16,
    left: 20,
    zIndex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
