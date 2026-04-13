import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const INACTIVE = '#A09890';
const ACTIVE   = '#8AB88A';
const SIZE     = 22;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function icon(active: IoniconsName, inactive: IoniconsName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={SIZE} color={color} />
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: 'rgba(251, 249, 244, 0.92)',
          borderTopWidth: 0.5,
          borderTopColor: '#e2e3d9',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: 'Manrope_500Medium',
          fontSize: 11,
        },
        tabBarIconStyle: { marginBottom: -2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Mi Planta', tabBarIcon: icon('leaf', 'leaf-outline') }}
      />
      <Tabs.Screen
        name="gratitud"
        options={{ title: 'Gratitud', tabBarIcon: icon('heart', 'heart-outline') }}
      />
      <Tabs.Screen
        name="descarga"
        options={{ title: 'Descarga', tabBarIcon: icon('cloud', 'cloud-outline') }}
      />
      <Tabs.Screen
        name="estado"
        options={{ title: 'Estado', tabBarIcon: icon('bar-chart', 'bar-chart-outline') }}
      />
      <Tabs.Screen
        name="journal"
        options={{ title: 'Diario', tabBarIcon: icon('book', 'book-outline') }}
      />
    </Tabs>
  );
}
