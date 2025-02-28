// Require dependencies
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const {
  getNodeAutoInstrumentations,
} = require('@opentelemetry/auto-instrumentations-node');
const {
  PeriodicExportingMetricReader,
} = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');


// Define OTLP endpoints (SigNoz uses these by default)
const COLLECTOR_URL = 'http://localhost:4318/v1/traces';
const METRICS_URL = 'http://localhost:4318/v1/metrics';

// Set service name
const serviceName = 'my-node-service';

// Configure OpenTelemetry SDK with SigNoz exporters
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName, // Set custom service name
  }),
  traceExporter: new OTLPTraceExporter({
    url: COLLECTOR_URL,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: METRICS_URL,
    }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

// Start OpenTelemetry SDK
sdk.start();

console.log(`OpenTelemetry SDK initialized for service: ${serviceName}`);
