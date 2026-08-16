import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "./types";
import LobbyScreen from "@/screens/LobbyScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import FriendsScreen from "@/screens/FriendsScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import { colors } from "@/lib/theme";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
      }}
    >
      <Tab.Screen name="Lobby" component={LobbyScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
