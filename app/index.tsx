import 'react-native-gesture-handler';
import React from 'react';
import { NavigationIndependentTree } from '@react-navigation/native';
import AppNavigator from '../src/navigation/AppNavigator';

export default function App() {
  return (
    <NavigationIndependentTree>
      <AppNavigator />
    </NavigationIndependentTree>
  );
}