import os
import httpx
from typing import Optional
import logging

MEWS_BASE_URL = os.getenv("MEWS_CONNECTOR_BASE_URL", "http://localhost:8001")
CONFIG_TOKEN = "demo-config-token"
CLIENT_TOKEN = "demo-client-token"


class MewsConnectorClient:
    def __init__(self):
        self.base_url = MEWS_BASE_URL

    async def add_customer(self, first_name: str, last_name: str, email: str, **kwargs) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(f"{self.base_url}/api/connector/v1/customers/add", json={
                "ConfigurationToken": CONFIG_TOKEN,
                "ClientToken": CLIENT_TOKEN,
                "FirstName": first_name, "LastName": last_name, "Email": email, **kwargs
            })
            return r.json()

    async def add_company(self, name: str, **kwargs) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(f"{self.base_url}/api/connector/v1/companies/add", json={
                "ConfigurationToken": CONFIG_TOKEN, "ClientToken": CLIENT_TOKEN, "Name": name, **kwargs
            })
            return r.json()

    async def add_company_contract(self, company_id: str, contract_name: str) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(f"{self.base_url}/api/connector/v1/companyContracts/add", json={
                "ConfigurationToken": CONFIG_TOKEN, "ClientToken": CLIENT_TOKEN,
                "CompanyId": company_id, "ContractName": contract_name
            })
            return r.json()

    async def add_reservation(self, resource_id: str, start_utc: str, end_utc: str,
                               rate_id: str, person_count: int = 1, notes: str = "",
                               partner_company_id: Optional[str] = None) -> dict:
        body = {
            "ConfigurationToken": CONFIG_TOKEN, "ClientToken": CLIENT_TOKEN,
            "ResourceId": resource_id, "StartUtc": start_utc, "EndUtc": end_utc,
            "RateId": rate_id, "PersonCount": person_count, "Notes": notes
        }
        if partner_company_id:
            body["PartnerCompanyId"] = partner_company_id
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(f"{self.base_url}/api/connector/v1/reservations/add", json=body)
            return r.json()

    async def confirm_reservations(self, reservation_ids: list[str]) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(f"{self.base_url}/api/connector/v1/reservations/confirm", json={
                "ConfigurationToken": CONFIG_TOKEN, "ClientToken": CLIENT_TOKEN,
                "ReservationIds": reservation_ids
            })
            return r.json()

    async def start_reservations(self, reservation_ids: list[str]) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(f"{self.base_url}/api/connector/v1/reservations/start", json={
                "ConfigurationToken": CONFIG_TOKEN, "ClientToken": CLIENT_TOKEN,
                "ReservationIds": reservation_ids
            })
            return r.json()

    async def process_reservations(self, reservation_ids: list[str]) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(f"{self.base_url}/api/connector/v1/reservations/process", json={
                "ConfigurationToken": CONFIG_TOKEN, "ClientToken": CLIENT_TOKEN,
                "ReservationIds": reservation_ids
            })
            return r.json()

    async def update_interval(self, reservation_id: str, start_utc: str, end_utc: str) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(f"{self.base_url}/api/connector/v1/reservations/updateInterval", json={
                "ConfigurationToken": CONFIG_TOKEN, "ClientToken": CLIENT_TOKEN,
                "ReservationId": reservation_id, "StartUtc": start_utc, "EndUtc": end_utc
            })
            return r.json()

    async def add_payment_plan(self, reservation_group_id: str, amount: int, frequency: str = "Monthly") -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(f"{self.base_url}/api/connector/v1/paymentPlans/add", json={
                "ConfigurationToken": CONFIG_TOKEN, "ClientToken": CLIENT_TOKEN,
                "ReservationGroupId": reservation_group_id, "Amount": amount, "Frequency": frequency
            })
            return r.json()

    async def get_all_resources(self, enterprise_ids: list[str]) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(f"{self.base_url}/api/connector/v1/resources/getAll", json={
                "ConfigurationToken": CONFIG_TOKEN, "ClientToken": CLIENT_TOKEN,
                "EnterpriseIds": enterprise_ids, "Limitation": {"Count": 1000}
            })
            return r.json()

    async def get_all_rates(self, enterprise_ids: list[str]) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(f"{self.base_url}/api/connector/v1/rates/getAll", json={
                "ConfigurationToken": CONFIG_TOKEN, "ClientToken": CLIENT_TOKEN,
                "EnterpriseIds": enterprise_ids, "Limitation": {"Count": 1000}
            })
            return r.json()
