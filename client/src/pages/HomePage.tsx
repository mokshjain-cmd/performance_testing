import { Button, Card } from '../components/common';
import { Layout } from '../components/layout';

export default function HomePage() {
  return (
    <Layout>
      <div className="space-y-6">
        <Card title="Welcome to Performance Testing Platform">
          <p className="text-gray-600 mb-4">
            Upload and analyze performance data from your devices.
          </p>
          <Button variant="primary">Get Started</Button>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Sessions">
            <p className="text-3xl font-bold text-blue-600">0</p>
            <p className="text-gray-500 text-sm">Total sessions</p>
          </Card>
          
          <Card title="Devices">
            <p className="text-3xl font-bold text-green-600">0</p>
            <p className="text-gray-500 text-sm">Registered devices</p>
          </Card>
          
          <Card title="Analyses">
            <p className="text-3xl font-bold text-purple-600">0</p>
            <p className="text-gray-500 text-sm">Completed analyses</p>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
