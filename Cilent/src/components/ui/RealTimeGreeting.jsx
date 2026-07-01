import React, { useEffect, useMemo, useState } from 'react';

const getGreeting = (hour) => {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const RealTimeGreeting = ({ name = 'Guest', subtitle }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => getGreeting(now.getHours()), [now]);
  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-100/70">
          Welcome back
        </p>
        <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
          {greeting}, {name}
        </h2>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2 text-blue-100/90 text-sm">
        <span className="font-semibold">{formattedTime}</span>
        <span className="text-xs sm:text-sm text-blue-100/70">{formattedDate}</span>
      </div>

      {subtitle ? (
        <p className="text-sm text-blue-100/85 max-w-2xl">{subtitle}</p>
      ) : null}
    </div>
  );
};

export default RealTimeGreeting;
