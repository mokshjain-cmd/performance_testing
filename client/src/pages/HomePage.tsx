import { Button, Card } from '../components/common';
import { Layout } from '../components/layout';

export default function HomePage() {
  return (
    <Layout>
      <div className="space-y-10">
        <Card title="Welcome to Performance Testing Platform">
          <p className="text-gray-600 mb-6 text-lg leading-relaxed">
            Upload and analyze performance data from your devices.
          </p>
          <Button variant="primary" size="lg">Get Started</Button>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card title="Sessions">
            <div className="mt-4">
              <p className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">0</p>
              <p className="text-gray-500 text-sm mt-2">Total sessions</p>
            </div>
          </Card>
          
          <Card title="Devices">
            <div className="mt-4">
              <p className="text-4xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">0</p>
              <p className="text-gray-500 text-sm mt-2">Registered devices</p>
            </div>
          </Card>
          
          <Card title="Analyses">
            <div className="mt-4">
              <p className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">0</p>
              <p className="text-gray-500 text-sm mt-2">Completed analyses</p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
