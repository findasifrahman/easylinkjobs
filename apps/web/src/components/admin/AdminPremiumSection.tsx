"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";

import {
  fetchAdminCompanies,
  fetchAdminCompanyPremium,
  fetchAdminSubscriptionPlans,
  grantAdminCompanyPremium,
  grantAdminCompanyUnlock,
} from "@/lib/api";
import { themeTokens } from "@/theme";

export function AdminPremiumSection() {
  const [companies, setCompanies] = useState<Array<Record<string, unknown>>>([]);
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  const [state, setState] = useState<{
    subscriptions: Array<Record<string, unknown>>;
    payment_customers: Array<Record<string, unknown>>;
  }>({ subscriptions: [], payment_customers: [] });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    company_id: "",
    plan_code: "premium_company",
    duration_days: "30",
    unlock_days: "14",
    search_unlock_days: "14",
  });

  const reloadPremiumState = async (companyId: string) => {
    const result = await fetchAdminCompanyPremium(companyId);
    setState({ subscriptions: result.subscriptions, payment_customers: result.payment_customers });
  };

  useEffect(() => {
    fetchAdminCompanies({ page: 1, pageSize: 20 })
      .then((r) => {
        setCompanies(r.items);
        if (r.items[0]) {
          setForm((c) => ({ ...c, company_id: c.company_id || String(r.items[0].id) }));
        }
      })
      .catch(() => setCompanies([]));
    fetchAdminSubscriptionPlans().then(setPlans).catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    if (!form.company_id) return;
    reloadPremiumState(form.company_id).catch(() => setState({ subscriptions: [], payment_customers: [] }));
  }, [form.company_id]);

  const runGrant = async (fn: () => Promise<unknown>, successText: string) => {
    if (!form.company_id) return;
    try {
      await fn();
      await reloadPremiumState(form.company_id);
      setMessage({ type: "success", text: successText });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Premium action failed." });
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
        <Stack spacing={2}>
          <Typography variant="h2">Premium controls</Typography>
          <Typography color="text.secondary">
            Manual subscription grants and one-off unlocks, including recruiter candidate search.
          </Typography>
          {message ? <Alert severity={message.type}>{message.text}</Alert> : null}
          <TextField
            select
            label="Company"
            value={form.company_id}
            onChange={(e) => setForm((c) => ({ ...c, company_id: e.target.value }))}
          >
            {companies.map((company) => (
              <MenuItem key={String(company.id)} value={String(company.id)}>
                {String(company.name)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Plan"
            value={form.plan_code}
            onChange={(e) => setForm((c) => ({ ...c, plan_code: e.target.value }))}
          >
            {plans.map((plan) => (
              <MenuItem key={String(plan.code)} value={String(plan.code)}>
                {String(plan.name ?? plan.code)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Plan days"
            type="number"
            value={form.duration_days}
            onChange={(e) => setForm((c) => ({ ...c, duration_days: e.target.value }))}
          />
          <TextField
            label="Contact unlock days"
            type="number"
            value={form.unlock_days}
            onChange={(e) => setForm((c) => ({ ...c, unlock_days: e.target.value }))}
          />
          <TextField
            label="Candidate search unlock days"
            type="number"
            value={form.search_unlock_days}
            onChange={(e) => setForm((c) => ({ ...c, search_unlock_days: e.target.value }))}
          />
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap">
            <Button
              variant="contained"
              disabled={!form.company_id}
              onClick={() =>
                runGrant(
                  () =>
                    grantAdminCompanyPremium(form.company_id, {
                      plan_code: form.plan_code,
                      duration_days: Number(form.duration_days) || 30,
                      provider: "manual_admin",
                    }),
                  "Premium plan granted."
                )
              }
            >
              Grant premium
            </Button>
            <Button
              variant="outlined"
              disabled={!form.company_id}
              onClick={() =>
                runGrant(
                  () =>
                    grantAdminCompanyUnlock(form.company_id, {
                      entitlement_code: "company.contact.unlock",
                      duration_days: Number(form.unlock_days) || 14,
                    }),
                  "Contact unlock granted."
                )
              }
            >
              Grant contact unlock
            </Button>
            <Button
              variant="outlined"
              disabled={!form.company_id}
              onClick={() =>
                runGrant(
                  () =>
                    grantAdminCompanyUnlock(form.company_id, {
                      entitlement_code: "candidate.search.unlock",
                      duration_days: Number(form.search_unlock_days) || 14,
                    }),
                  "Recruiter candidate search unlocked."
                )
              }
            >
              Grant candidate search
            </Button>
          </Stack>
          {state.subscriptions.slice(0, 4).map((subscription) => (
            <Card key={String(subscription.id)} variant="outlined">
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {String(subscription.plan_code ?? "Plan")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Status: {String(subscription.status ?? "")}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Entitlements: {Array.isArray(subscription.entitlement_codes) ? (subscription.entitlement_codes as Array<unknown>).join(", ") : "none"}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
