// components/ServerStatusBar.tsx
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { fetchHealth, HealthStatus } from '../../services/health';

type Props = {
    pollIntervalMs?: number;
};

export default function ServerStatusBar({ pollIntervalMs = 5000 }: Props) {
    const [status, setStatus] = useState<HealthStatus>('DOWN');

    useEffect(() => {
        let mounted = true;
        let timer: ReturnType<typeof setInterval>;

        const check = async () => {
            const s = await fetchHealth();
            if (mounted) setStatus(s);
        };

        check();
        timer = setInterval(check, pollIntervalMs);

        return () => {
            mounted = false;
            clearInterval(timer);
        };
    }, [pollIntervalMs]);


    const isUp = status === 'UP';

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: isUp ? '#e6ffed' : '#ffe6e6',
                borderTopWidth: 1,
                borderTopColor: isUp ? '#1f883d' : '#b00020',
            }}
        >
            <View
                style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    marginRight: 8,
                    backgroundColor: isUp ? '#1f883d' : '#b00020',
                }}
            />
            <Text style={{ color: isUp ? '#1f883d' : '#b00020', fontWeight: '600' }}>
                {isUp ? 'Server OK' : 'Server DOWN'}
            </Text>
        </View>
    );
}
