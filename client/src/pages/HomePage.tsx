import { Button, Card } from '../components/common';
import { Layout } from '../components/layout';

export default function HomePage() {
  return (
    <Layout>
      <div className="space-y-12">

        {/* Hero Section */}
        <Card title="Performance Benchmark & Testing Platform">
          <div className="space-y-6">
            <p className="text-gray-600 text-lg leading-relaxed">
              Analyze, benchmark, and validate device performance with 
              structured testing sessions and detailed analytics.
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
              <p className="text-blue-800 font-medium">
                Kindly login to proceed to your dashboard and access session analytics.
              </p>
            </div>

            
            
          </div>
        </Card>

        

        {/* Benchmark Description Section */}
        <Card title="About the Platform">
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>
              This platform is designed for structured performance testing and 
              benchmarking of wearable devices against reference standards.
            </p>
            <p>
              Track session-level metrics such as:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Mean Absolute Error (MAE)</li>
              <li>Root Mean Square Error (RMSE)</li>
              <li>MAPE (%)</li>
              <li>Pearson Correlation</li>
              <li>Bias Analysis</li>
            </ul>
            <p>
              Generate detailed reports, monitor firmware improvements, and 
              evaluate device accuracy across activities like Sitting, Walking, 
              Strength Training, and Running.
            </p>
          </div>
        </Card>

      </div>
    </Layout>
  );
}