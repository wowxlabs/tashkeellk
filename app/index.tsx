import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import RadioScreen from '../src/screens/RadioScreen';
import YouTubeScreen from '../src/screens/YouTubeScreen';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
         headerStyle: {
//                height: 80, // Reduce height to avoid excessive padding
               backgroundColor: '#fff', // Match your app theme
             },
             headerTitleAlign: 'center', // Center title properly
             headerTitleStyle: {
               fontSize: 22, // Adjust font size if needed
               fontWeight: 'bold',
             },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'YouTube') {
            iconName = focused ? 'logo-youtube' : 'logo-youtube';
          } else if (route.name === 'Radio') {
            iconName = focused ? 'radio' : 'radio-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'red',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: 40, // Reduce height to avoid excessive padding
          paddingBottom: 5, // Adjust bottom padding
          paddingTop: 5, // Ensure icons are centered
        },
      })}
    >
      <Tab.Screen name="YouTube" component={YouTubeScreen} />
      <Tab.Screen name="Radio" component={RadioScreen} />
    </Tab.Navigator>

  );
}