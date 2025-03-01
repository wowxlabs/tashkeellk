import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import RadioScreen from '../src/screens/RadioScreen';
import YouTubeScreen from '../src/screens/YouTubeScreen';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
 return (
   <Tab.Navigator
     screenOptions={({ route }) => ({
       tabBarIcon: ({ focused, color, size }) => {
         let iconName;

         if (route.name === 'Sermons') {
           iconName = focused ? 'logo-youtube' : 'logo-youtube';
         } else if (route.name === 'Radio') {
           iconName = focused ? 'radio' : 'radio-outline';
         }

         return <Ionicons name={iconName} size={size} color={color} />;
       },
       tabBarActiveTintColor: 'red',
       tabBarInactiveTintColor: 'gray',
       headerTitleAlign: 'center', // Centers the header title
     })}
   >
     <Tab.Screen
       name="Sermons"
       component={YouTubeScreen}
       options={{ title: 'Sermons' }} // Set title explicitly
     />
     <Tab.Screen
       name="Radio"
       component={RadioScreen}
       options={{ title: 'Radio' }} // Set title explicitly
     />
   </Tab.Navigator>
 );
}

