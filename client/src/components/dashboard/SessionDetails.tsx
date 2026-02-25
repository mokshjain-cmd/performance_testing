import React from 'react';
import type { Session } from '../../types';
import { splitDateTime } from '../../utils/dateTime';

interface Props {
  session: Session;
}

const SessionDetails: React.FC<Props> = ({ session }) => {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-4 transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.08)]">
      
      <h2 className="mb-3 text-xl font-semibold text-gray-800">
        Session Details
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 text-sm">

        {/* ID */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Session ID</span>
          <span className="text-sm text-gray-800 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
            {session._id}
          </span>
        </div>

        {/* User */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">User</span>
          <span className="text-sm text-gray-800 bg-gray-50 px-2 py-1 rounded border border-gray-200">
            {session.userId?.name}
          </span>
        </div>

        {/* Activity */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activity</span>
          <span className="text-sm text-gray-800 bg-gray-50 px-2 py-1 rounded border border-gray-200 capitalize">
            {session.activityType}
          </span>
        </div>

        {/* Start */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Time</span>
          <div className="flex gap-1">
            <span className="text-sm bg-gray-50 px-2 py-1 rounded border border-gray-200">
              {splitDateTime(session.startTime).date}
            </span>
            <span className="text-sm bg-gray-50 px-2 py-1 rounded border border-gray-200">
              {splitDateTime(session.startTime).time}
            </span>
          </div>
        </div>

        {/* End */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Time</span>
          <div className="flex gap-1">
            <span className="text-sm bg-gray-50 px-2 py-1 rounded border border-gray-200">
              {splitDateTime(session.endTime).date}
            </span>
            <span className="text-sm bg-gray-50 px-2 py-1 rounded border border-gray-200">
              {splitDateTime(session.endTime).time}
            </span>
          </div>
        </div>

        {/* Duration */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</span>
          <span className="text-sm text-gray-800 bg-gray-50 px-2 py-1 rounded border border-gray-200">
            {session.durationSec}s
          </span>
        </div>

        {/* Devices */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Devices</span>
          <div className="flex flex-wrap gap-1">
            {session.devices.map((d) => (
              <span
                key={d.deviceId}
                className="text-sm bg-gray-50 px-2 py-1 rounded border border-gray-200"
                >
                {d.deviceType}
              </span>
            ))}
          </div>
        </div>

        {/* Benchmark */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Benchmark</span>
          <span className="text-sm text-gray-800 bg-gray-50 px-2 py-1 rounded border border-gray-200">
            {session.benchmarkDeviceType}
          </span>
        </div>

        {/* Band Position */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Band Position</span>
          <span className="text-sm text-gray-800 bg-gray-50 px-2 py-1 rounded border border-gray-200 capitalize">
            {session.bandPosition}
          </span>
        </div>

        {/* Valid */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Valid</span>
          <span
            className={`text-sm px-2 py-1 rounded font-medium ${
              session.isValid
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
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
