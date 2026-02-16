import React from 'react';
import type { Session } from '../../types';
import { splitDateTime } from '../../utils/dateTime';

interface Props {
  session: Session;
}

const SessionDetails: React.FC<Props> = ({ session }) => {
  return (
    <div className="mb-8 rounded-2xl border border-gray-200 bg-gradient-to-br from-[#fafdff] to-[#f3f4f8] p-7 shadow-[0_4px_24px_0_rgba(60,60,67,0.10)]">
      
      <h2 className="mb-5 text-2xl font-bold text-gray-800">
        Session Details
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-center text-sm">

        {/* ID */}
        <div>
          <strong>ID:</strong>{' '}
          <span className="rounded-lg bg-indigo-100 px-3 py-1 text-gray-800 shadow-sm">
            {session._id}
          </span>
        </div>

        {/* User */}
        <div>
          <strong>User:</strong>{' '}
          <span className="rounded-lg bg-indigo-100 px-3 py-1 text-gray-800 shadow-sm">
            {session.userId?.name} ({session.userId?.email})
          </span>
        </div>

        {/* Activity */}
        <div>
          <strong>Activity:</strong>{' '}
          <span className="rounded-lg bg-yellow-100 px-3 py-1 text-gray-800 shadow-sm">
            {session.activityType}
          </span>
        </div>

        {/* Start */}
        <div>
          <strong>Start:</strong>{' '}
          <span className="mr-2 rounded-lg bg-green-200 px-3 py-1 shadow-sm">
            {splitDateTime(session.startTime).date}
          </span>
          <span className="rounded-lg bg-green-200 px-3 py-1 shadow-sm">
            {splitDateTime(session.startTime).time}
          </span>
        </div>

        {/* End */}
        <div>
          <strong>End:</strong>{' '}
          <span className="mr-2 rounded-lg bg-red-200 px-3 py-1 shadow-sm">
            {splitDateTime(session.endTime).date}
          </span>
          <span className="rounded-lg bg-red-200 px-3 py-1 shadow-sm">
            {splitDateTime(session.endTime).time}
          </span>
        </div>

        {/* Duration */}
        <div>
          <strong>Duration:</strong>{' '}
          <span className="rounded-lg bg-purple-100 px-3 py-1 shadow-sm">
            {session.durationSec}s
          </span>
        </div>

        {/* Devices */}
        <div>
          <strong>Devices:</strong>{' '}
          {session.devices.map((d) => (
            <span
              key={d.deviceId}
              className="mr-2 inline-block rounded-lg bg-sky-200 px-3 py-1 shadow-sm"
            >
              {d.deviceType}
            </span>
          ))}
        </div>

        {/* Benchmark */}
        <div>
          <strong>Benchmark:</strong>{' '}
          <span className="rounded-lg bg-amber-300 px-3 py-1 shadow-sm">
            {session.benchmarkDeviceType}
          </span>
        </div>

        {/* Band Position */}
        <div>
          <strong>Band Position:</strong>{' '}
          <span className="rounded-lg bg-yellow-200 px-3 py-1 shadow-sm">
            {session.bandPosition}
          </span>
        </div>

        {/* Valid */}
        <div>
          <strong>Valid:</strong>{' '}
          <span
            className={`rounded-lg px-3 py-1 shadow-sm ${
              session.isValid
                ? 'bg-green-200'
                : 'bg-red-200'
            }`}
          >
            {session.isValid ? 'Yes' : 'No'}
          </span>
        </div>

      </div>
    </div>
  );
};

export default SessionDetails;
