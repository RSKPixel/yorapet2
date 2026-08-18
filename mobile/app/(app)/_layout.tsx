import { Tabs } from "expo-router";
import { Pressable, Text, View } from "react-native";
import {
  BanknotesIcon,
  DocumentChartBarIcon,
  PresentationChartLineIcon,
  ShoppingBagIcon,
} from "react-native-heroicons/outline";

import { useAuth } from "@/auth/AuthContext";
import { BrandName } from "@/components/brand";
import { colors, typography } from "@/theme";

export default function AppLayout() {
  const { logout } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: {
          ...typography.title,
          color: colors.ink,
        },
        headerLeft: () => (
          <View style={{ paddingLeft: 16 }}>
            <BrandName />
          </View>
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surfaceRaised,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          ...typography.muted,
          fontSize: 12,
        },
        headerRight: () => (
          <Pressable
            onPress={() => {
              void logout();
            }}
            style={{ paddingHorizontal: 16 }}
          >
            <Text
              style={{
                ...typography.button,
                color: colors.accent,
              }}
            >
              Log out
            </Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="sales"
        options={{
          title: "Sales",
          tabBarLabel: "Sales",
          headerTitle: "Sales",
          tabBarIcon: ({ color, size }) => (
            <BanknotesIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="purchases"
        options={{
          title: "Purchases",
          tabBarLabel: "Purchases",
          headerTitle: "Purchases",
          tabBarIcon: ({ color, size }) => (
            <ShoppingBagIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stock",
          tabBarLabel: "Stock",
          headerTitle: "Stock summary",
          tabBarIcon: ({ color, size }) => (
            <DocumentChartBarIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="pnl"
        options={{
          title: "P&L",
          tabBarLabel: "P&L",
          headerTitle: "Stock Wise P&L",
          tabBarIcon: ({ color, size }) => (
            <PresentationChartLineIcon color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
