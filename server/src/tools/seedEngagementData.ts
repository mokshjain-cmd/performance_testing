/**
 * Seed script for populating engagement monitoring data
 * Run: npx ts-node src/tools/seedEngagementData.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import User from '../models/Users';
import DailyEngagementMetrics from '../models/DailyEngagementMetrics';

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI_DEV || '';

// Dummy users data
const dummyUsers = [
  {
    name: 'John Active',
    email: 'john.active@test.com',
    role: 'tester',
    metadata: {
      age: 28,
      gender: 'male',
      weight: 75,
      height: 178
    }
  },
  {
    name: 'Sarah AtRisk',
    email: 'sarah.atrisk@test.com',
    role: 'tester',
    metadata: {
      age: 32,
      gender: 'female',
      weight: 62,
      height: 165
    }
  },
  {
    name: 'Mike Inactive',
    email: 'mike.inactive@test.com',
    role: 'tester',
    metadata: {
      age: 35,
      gender: 'male',
      weight: 82,
      height: 180
    }
  }
];

// Helper function to generate random data
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

// Generate HR time-series data (every 5 minutes)
function generateHRTimeSeries(
  baseDate: Date, 
  avgHR: number, 
  minHR: number, 
  maxHR: number,
  wearTimeMinutes: number
): Array<{ timestamp: Date; value: number }> {
  const timeSeries = [];
  const totalIntervals = Math.floor(wearTimeMinutes / 5); // 5-minute intervals
  const startHour = randomInt(6, 9); // Start wearing device between 6-9 AM
  
  for (let i = 0; i < totalIntervals; i++) {
    const timestamp = new Date(baseDate);
    timestamp.setHours(startHour);
    timestamp.setMinutes(i * 5);
    
    // Generate HR value with some variation around avgHR
    const variance = (maxHR - minHR) / 4;
    const hr = Math.round(avgHR + (Math.random() - 0.5) * variance);
    const clampedHR = Math.max(minHR, Math.min(maxHR, hr));
    
    timeSeries.push({
      timestamp,
      value: clampedHR
    });
  }
  
  return timeSeries;
}

// Generate SpO2 time-series data (every 15 minutes)
function generateSpO2TimeSeries(
  baseDate: Date,
  avgSpO2: number,
  minSpO2: number,
  maxSpO2: number,
  dataPoints: number
): Array<{ timestamp: Date; value: number }> {
  const timeSeries = [];
  const startHour = randomInt(20, 22); // SpO2 usually recorded during sleep
  
  for (let i = 0; i < dataPoints; i++) {
    const timestamp = new Date(baseDate);
    timestamp.setHours(startHour);
    timestamp.setMinutes(i * 15);
    
    // Generate SpO2 value with small variation
    const variance = (maxSpO2 - minSpO2) / 3;
    const spo2 = avgSpO2 + (Math.random() - 0.5) * variance;
    const clampedSpO2 = Math.max(minSpO2, Math.min(maxSpO2, spo2));
    
    timeSeries.push({
      timestamp,
      value: parseFloat(clampedSpO2.toFixed(1))
    });
  }
  
  return timeSeries;
}

// Generate sleep hypnograph (minute-by-minute sleep stages)
function generateSleepHypnograph(
  totalSleepMinutes: number,
  stages: { awakeSec: number; deepSec: number; remSec: number; lightSec: number }
): Array<{ minute: number; stage: 'awake' | 'light' | 'deep' | 'rem' }> {
  const hypnograph = [];
  
  // Convert seconds to proportions
  const totalSec = stages.awakeSec + stages.deepSec + stages.remSec + stages.lightSec;
  const awakeProp = stages.awakeSec / totalSec;
  const deepProp = stages.deepSec / totalSec;
  const remProp = stages.remSec / totalSec;
  const lightProp = stages.lightSec / totalSec;
  
  // Generate realistic sleep pattern (sleep cycles are ~90 minutes)
  for (let minute = 0; minute < totalSleepMinutes; minute++) {
    let stage: 'awake' | 'light' | 'deep' | 'rem';
    
    const cyclePosition = minute % 90; // Position in 90-minute sleep cycle
    const rand = Math.random();
    
    // First 30 min: mostly light and deep
    if (cyclePosition < 30) {
      stage = rand < 0.7 ? 'light' : 'deep';
    }
    // Next 30 min: deep sleep
    else if (cyclePosition < 60) {
      stage = rand < 0.8 ? 'deep' : 'light';
    }
    // Last 30 min: REM and light
    else {
      if (rand < 0.5) stage = 'rem';
      else if (rand < 0.9) stage = 'light';
      else stage = 'awake';
    }
    
    hypnograph.push({ minute, stage });
  }
  
  return hypnograph;
}

// Generate hourly step counts
function generateHourlySteps(totalSteps: number): Array<{ hour: number; steps: number }> {
  const hourlySteps = [];
  const activeHours = [7, 8, 9, 12, 13, 17, 18, 19]; // Typical active hours
  
  // Distribute steps across active hours
  let remainingSteps = totalSteps;
  
  for (let hour = 0; hour < 24; hour++) {
    let steps = 0;
    
    if (activeHours.includes(hour) && remainingSteps > 0) {
      // Active hours get more steps
      const proportion = 1 / activeHours.length;
      steps = Math.round(totalSteps * proportion * (0.8 + Math.random() * 0.4));
      steps = Math.min(steps, remainingSteps);
      remainingSteps -= steps;
    } else if (remainingSteps > 0) {
      // Non-active hours get minimal steps
      steps = Math.round(Math.random() * 100);
      steps = Math.min(steps, remainingSteps);
      remainingSteps -= steps;
    }
    
    hourlySteps.push({ hour, steps });
  }
  
  return hourlySteps;
}

// Generate engagement metrics for a specific date
function generateMetricsForDate(userId: any, date: Date, userType: string) {
  const dateStr = date.toISOString().split('T')[0];
  
  // Different patterns based on user type
  let hrDataChance, sleepChance, activityChance, spo2Chance;
  
  if (userType === 'active') {
    hrDataChance = 0.95;
    sleepChance = 0.9;
    activityChance = 0.95;
    spo2Chance = 0.8;
  } else if (userType === 'atrisk') {
    hrDataChance = 0.7;
    sleepChance = 0.7;
    activityChance = 0.6;
    spo2Chance = 0.5;
  } else { // inactive
    hrDataChance = 0.3;
    sleepChance = 0.3;
    activityChance = 0.2;
    spo2Chance = 0.2;
  }
  
  const hasHR = Math.random() < hrDataChance;
  const hasSleep = Math.random() < sleepChance;
  const hasActivity = Math.random() < activityChance;
  const hasSpO2 = Math.random() < spo2Chance;
  
  const metricsCollected = [];
  let engagementScore = 0;
  
  // HR data
  const avgHR = hasHR ? randomInt(60, 85) : undefined;
  const minHR = hasHR ? randomInt(48, 60) : undefined;
  const maxHR = hasHR ? randomInt(100, 130) : undefined;
  const wearTimeMinutes = hasHR ? randomInt(300, 1440) : undefined;
  
  const hr = {
    hasData: hasHR,
    dataPoints: hasHR ? randomInt(200, 1440) : 0,
    avgHR,
    minHR,
    maxHR,
    wearTimeMinutes,
    // Generate time-series data (every 5 minutes)
    timeSeries: hasHR && avgHR && minHR && maxHR && wearTimeMinutes 
      ? generateHRTimeSeries(date, avgHR, minHR, maxHR, wearTimeMinutes)
      : undefined
  };
  
  if (hasHR) {
    metricsCollected.push('HR');
    const wearTime = hr.wearTimeMinutes || 0;
    engagementScore += Math.min((wearTime / 1440) * 25, 25);
  }
  
  // Sleep data
  const sleepStart = new Date(date);
  sleepStart.setHours(22, randomInt(0, 59), 0);
  const sleepEnd = new Date(date);
  sleepEnd.setDate(sleepEnd.getDate() + 1);
  sleepEnd.setHours(6, randomInt(0, 59), 0);
  
  const totalSleepMin = hasSleep ? randomInt(360, 540) : undefined;
  const sleepStages = hasSleep ? {
    awakeSec: randomInt(300, 1800),
    deepSec: randomInt(3600, 7200),
    remSec: randomInt(3600, 7200),
    lightSec: randomInt(7200, 14400)
  } : undefined;
  
  const sleep = {
    hasData: hasSleep,
    sleepScore: hasSleep ? randomInt(60, 95) : undefined,
    startTime: hasSleep ? sleepStart : undefined,
    endTime: hasSleep ? sleepEnd : undefined,
    totalSleepMinutes: totalSleepMin,
    stages: sleepStages,
    // Generate hypnograph (minute-by-minute sleep stages)
    hypnograph: hasSleep && totalSleepMin && sleepStages
      ? generateSleepHypnograph(totalSleepMin, sleepStages)
      : undefined
  };
  
  if (hasSleep) {
    metricsCollected.push('Sleep');
    engagementScore += 25;
  }
  
  // Activity data
  const totalSteps = hasActivity ? randomInt(2000, 12000) : undefined;
  
  const activity = {
    hasData: hasActivity,
    steps: totalSteps,
    distanceMeters: hasActivity ? randomInt(1500, 9000) : undefined,
    caloriesTotal: hasActivity ? randomInt(1800, 2800) : undefined,
    caloriesActive: hasActivity ? randomInt(400, 800) : undefined,
    caloriesBasal: hasActivity ? randomInt(1400, 2000) : undefined,
    // Generate hourly step distribution
    hourlySteps: hasActivity && totalSteps 
      ? generateHourlySteps(totalSteps)
      : undefined
  };
  
  if (hasActivity) {
    metricsCollected.push('Activity');
    engagementScore += 25;
  }
  
  // SpO2 data
  const spo2DataPoints = hasSpO2 ? randomInt(10, 96) : 0;
  const avgSpO2 = hasSpO2 ? randomFloat(95, 99) : undefined;
  const minSpO2 = hasSpO2 ? randomFloat(92, 95) : undefined;
  const maxSpO2 = hasSpO2 ? randomFloat(98, 100) : undefined;
  
  const spo2 = {
    hasData: hasSpO2,
    dataPoints: spo2DataPoints,
    avgSpO2,
    minSpO2,
    maxSpO2,
    // Generate time-series data (every 15 minutes)
    timeSeries: hasSpO2 && avgSpO2 && minSpO2 && maxSpO2
      ? generateSpO2TimeSeries(date, avgSpO2, minSpO2, maxSpO2, spo2DataPoints)
      : undefined
  };
  
  if (hasSpO2) {
    metricsCollected.push('SpO2');
    const dataPoints = spo2.dataPoints || 0;
    engagementScore += Math.min((dataPoints / 10) * 15, 15);
  }
  
  // Workouts (optional)
  const workouts = [];
  if (Math.random() < 0.3 && hasActivity) {
    workouts.push({
      type: ['running', 'cycling', 'walking', 'strength'][randomInt(0, 3)],
      startTime: new Date(date.getTime() + randomInt(6, 20) * 3600000),
      durationMinutes: randomInt(20, 60),
      caloriesBurned: randomInt(150, 500)
    });
    metricsCollected.push('Workouts');
    engagementScore += 10;
  }
  
  return {
    userId,
    date: new Date(date.setHours(0, 0, 0, 0)),
    deviceType: 'luna',
    logFileName: `luna_daily_${userId}_${dateStr}.txt`,
    uploadedAt: new Date(),
    parsedAt: new Date(),
    hr,
    sleep,
    activity,
    spo2,
    workouts,
    engagementScore: Math.round(Math.min(engagementScore, 100)),
    metricsCollected
  };
}

async function seedData() {
  try {
    console.log('\n🌱 Starting engagement data seeding...\n');
    
    // Connect to MongoDB
    console.log(`📡 Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Clear existing engagement data
    console.log('🧹 Clearing existing engagement data...');
    await DailyEngagementMetrics.deleteMany({});
    console.log('✅ Cleared existing engagement metrics\n');
    
    // Clear existing test users
    console.log('🧹 Clearing existing test users...');
    await User.deleteMany({ email: { $in: dummyUsers.map(u => u.email) } });
    console.log('✅ Cleared existing test users\n');
    
    // Create users
    console.log('👤 Creating dummy users...');
    const createdUsers = [];
    for (const userData of dummyUsers) {
      const user = await User.create(userData);
      createdUsers.push(user);
      console.log(`   ✓ Created: ${user.name} (${user.email})`);
    }
    console.log('\n');
    
    // Generate engagement metrics for each user
    const today = new Date();
    const userTypes = ['active', 'atrisk', 'inactive'];
    
    for (let i = 0; i < createdUsers.length; i++) {
      const user = createdUsers[i];
      const userType = userTypes[i];
      
      console.log(`📊 Generating engagement data for ${user.name} (${userType})...`);
      
      // Generate 5 days of data (including today)
      const daysToGenerate = userType === 'inactive' ? 4 : 5;
      
      for (let dayOffset = daysToGenerate - 1; dayOffset >= 0; dayOffset--) {
        const date = new Date(today);
        date.setDate(date.getDate() - dayOffset);
        
        const metrics = generateMetricsForDate(user._id, date, userType);
        await DailyEngagementMetrics.create(metrics);
        
        const dateStr = date.toISOString().split('T')[0];
        console.log(`   ✓ ${dateStr}: Score ${metrics.engagementScore}, Metrics: ${metrics.metricsCollected.join(', ')}`);
      }
      
      // For inactive user, add a gap (no data for last few days)
      if (userType === 'inactive') {
        console.log(`   ⚠ Note: Last day intentionally missing (inactive pattern)`);
      }
      
      console.log('\n');
    }
    
    // Summary
    console.log('='.repeat(60));
    console.log('✨ SEEDING COMPLETE!');
    console.log('='.repeat(60));
    
    const totalMetrics = await DailyEngagementMetrics.countDocuments();
    console.log(`\n📈 Summary:`);
    console.log(`   • Users created: ${createdUsers.length}`);
    console.log(`   • Total engagement records: ${totalMetrics}`);
    console.log(`   • Average records per user: ${Math.round(totalMetrics / createdUsers.length)}`);
    
    console.log(`\n🔑 Test User Credentials:`);
    for (const user of createdUsers) {
      console.log(`   • ${user.email} - ${user.name}`);
    }
    
    console.log(`\n🚀 Ready to test! Navigate to /admin/engagement in the UI\n`);
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB\n');
  }
}

// Run the seeder
seedData()
  .then(() => {
    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
