"use client";

import { useState } from "react";
import { Terminal, Play, Copy, SquareCheck, Clock, AlertCircle } from "lucide-react";

interface ApiPlaygroundProps {
  orgSlug: string;
}

export function ApiPlayground({ orgSlug }: ApiPlaygroundProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<"GET_PROJECTS" | "POST_PROJECT" | "STRIPE_WEBHOOK">("GET_PROJECTS");
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [responseBody, setResponseBody] = useState<string | null>(null);

  const mockToken = `omni_live_${orgSlug}_${Math.random().toString(36).substring(2, 10)}`;

  const endpointConfig = {
    GET_PROJECTS: {
      method: "GET",
      url: `/api/projects?orgSlug=${orgSlug}`,
      curl: `curl -X GET "http://localhost:3000/api/projects?orgSlug=${orgSlug}" \\
  -H "Authorization: Bearer ${mockToken}" \\
  -H "Content-Type: application/json"`,
    },
    POST_PROJECT: {
      method: "POST",
      url: `/api/projects`,
      body: JSON.stringify({
        orgSlug,
        name: "Telemetry Engine v3",
        description: "High-throughput telemetry ingestion pipeline.",
      }, null, 2),
      curl: `curl -X POST "http://localhost:3000/api/projects" \\
  -H "Authorization: Bearer ${mockToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"orgSlug":"${orgSlug}","name":"Telemetry Engine v3","description":"High-throughput telemetry ingestion pipeline."}'`,
    },
    STRIPE_WEBHOOK: {
      method: "POST",
      url: `/api/webhooks/stripe`,
      body: JSON.stringify({
        id: "evt_playground_" + Date.now(),
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_test_" + orgSlug,
            customer: "cus_mock_" + orgSlug,
            status: "active",
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
            items: {
              data: [{ price: { id: "price_enterprise_monthly_456" } }]
            },
            metadata: { organizationId: orgSlug }
          }
        }
      }, null, 2),
      curl: `curl -X POST "http://localhost:3000/api/webhooks/stripe" \\
  -H "x-mock-webhook: true" \\
  -H "Content-Type: application/json" \\
  -d '{"id":"evt_playground_123","type":"customer.subscription.updated","data":{"object":{"id":"sub_test_${orgSlug}","customer":"cus_mock_${orgSlug}","status":"active"}}}'`,
    },
  };

  const activeConfig = endpointConfig[selectedEndpoint];

  function handleCopyCurl() {
    navigator.clipboard.writeText(activeConfig.curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  }

  async function handleExecuteRequest() {
    setIsLoading(true);
    setResponseStatus(null);
    setLatency(null);
    setResponseBody(null);

    const start = performance.now();
    try {
      const options: RequestInit = {
        method: activeConfig.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mockToken}`,
          ...(selectedEndpoint === "STRIPE_WEBHOOK" ? { "x-mock-webhook": "true" } : {}),
        },
      };

      if ("body" in activeConfig && activeConfig.body) {
        options.body = activeConfig.body;
      }

      const res = await fetch(activeConfig.url, options);
      const duration = Math.round(performance.now() - start);
      const data = await res.json();

      setResponseStatus(res.status);
      setLatency(duration);
      setResponseBody(JSON.stringify(data, null, 2));
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      setResponseStatus(500);
      setLatency(duration);
      setResponseBody(JSON.stringify({ error: err.message || "Request failed" }, null, 2));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-neutral-200 shadow-2xs overflow-hidden space-y-4 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-950 flex items-center gap-2">
            <Terminal className="h-4 w-4 text-neutral-950" />
            <span>API Explorer</span>
          </h3>
          <p className="text-xs text-neutral-500">
            Execute scoped HTTP requests against endpoints for workspace <code className="font-mono text-neutral-900">/{orgSlug}</code>.
          </p>
        </div>

        {/* Endpoint Selector Tabs */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
          <button
            onClick={() => setSelectedEndpoint("GET_PROJECTS")}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              selectedEndpoint === "GET_PROJECTS" ? "bg-white text-neutral-950 font-semibold shadow-xs" : "text-neutral-500 hover:text-neutral-950"
            }`}
          >
            GET /api/projects
          </button>
          <button
            onClick={() => setSelectedEndpoint("POST_PROJECT")}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              selectedEndpoint === "POST_PROJECT" ? "bg-white text-neutral-950 font-semibold shadow-xs" : "text-neutral-500 hover:text-neutral-950"
            }`}
          >
            POST /api/projects
          </button>
          <button
            onClick={() => setSelectedEndpoint("STRIPE_WEBHOOK")}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              selectedEndpoint === "STRIPE_WEBHOOK" ? "bg-white text-neutral-950 font-semibold shadow-xs" : "text-neutral-500 hover:text-neutral-950"
            }`}
          >
            POST /api/webhooks/stripe
          </button>
        </div>
      </div>

      {/* cURL Display & Execute Action */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-neutral-700">cURL Snippet</span>
          <button
            onClick={handleCopyCurl}
            className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-950 transition-colors cursor-pointer"
          >
            {copiedCurl ? <SquareCheck className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            <span>{copiedCurl ? "Copied" : "Copy cURL"}</span>
          </button>
        </div>

        <pre className="p-3.5 rounded-xl bg-neutral-950 text-neutral-100 text-[11px] font-mono overflow-x-auto leading-relaxed">
          {activeConfig.curl}
        </pre>
      </div>

      {/* Execution Button */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Method:</span>
          <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-900 font-mono text-[10px] font-bold border border-neutral-200">
            {activeConfig.method}
          </span>
          <span className="text-xs font-mono text-neutral-700">{activeConfig.url}</span>
        </div>

        <button
          onClick={handleExecuteRequest}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>{isLoading ? "Running..." : "Run Request"}</span>
        </button>
      </div>

      {/* Live Output Inspector */}
      {responseBody && (
        <div className="space-y-2 pt-2 border-t border-neutral-100 animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-900">Response Status:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                  responseStatus && responseStatus < 300
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                {responseStatus} OK
              </span>
            </div>

            {latency !== null && (
              <span className="text-[11px] text-neutral-500 font-mono flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Roundtrip Latency: <strong>{latency}ms</strong></span>
              </span>
            )}
          </div>

          <pre className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed">
            {responseBody}
          </pre>
        </div>
      )}
    </div>
  );
}
