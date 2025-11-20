import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { store, useAppDispatch } from './src/store';
import { setAuth } from './src/store/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RootNavigator from './src/navigation/RootNavigator';

function AppLoader() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const loadToken = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        try {
          // const user = await me(); 
          // dispatch(setAuth({ user, token }));
        } catch {
          await AsyncStorage.removeItem('authToken'); 
        }
      }
    };
    loadToken();
  }, []);

  return <RootNavigator />;
}

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <AppLoader />
      </NavigationContainer>
    </Provider>
  );
}
