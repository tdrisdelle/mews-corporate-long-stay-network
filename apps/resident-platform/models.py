from sqlalchemy import Column, String, Integer, Boolean, Numeric, Date, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from database import Base


class Resident(Base):
    __tablename__ = "residents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    phone = Column(String)
    employment_context = Column(JSONB)
    home_jurisdiction = Column(String)
    mews_customer_links = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Buyer(Base):
    __tablename__ = "buyers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    legal_name = Column(String, nullable=False)
    buyer_type = Column(String)  # staffing_agency, corporate_mobility, etc.
    billing_address = Column(JSONB)
    primary_contact = Column(JSONB)
    nma_status = Column(String, default="draft")
    nma_terms = Column(JSONB)
    take_rate_pct = Column(Numeric(4, 2), default=5.50)
    mews_company_links = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class NetworkProperty(Base):
    __tablename__ = "network_properties"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mews_enterprise_id = Column(UUID(as_uuid=True), nullable=False)
    legal_name = Column(String, nullable=False)
    metro = Column(String)
    jurisdiction = Column(String, nullable=False)
    operator_type = Column(String)
    npa_status = Column(String, default="pending")
    rate_floor_cents = Column(Integer)
    max_network_exposure_pct = Column(Integer)
    accepts_network_bookings = Column(Boolean, default=False)
    unit_count = Column(Integer)
    photo_url = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Lease(Base):
    __tablename__ = "leases"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    buyer_id = Column(UUID(as_uuid=True), ForeignKey("buyers.id"))
    property_id = Column(UUID(as_uuid=True), ForeignKey("network_properties.id"), nullable=False)
    state = Column(String, nullable=False, default="draft")
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    unit_count = Column(Integer, nullable=False, default=1)
    monthly_rent_cents = Column(Integer, nullable=False)
    deposit_cents = Column(Integer)
    jurisdiction = Column(String, nullable=False)
    mews_reservation_group_id = Column(UUID(as_uuid=True))
    mews_payment_plan_id = Column(UUID(as_uuid=True))
    network_take_rate_pct = Column(Numeric(4, 2))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class LeaseResident(Base):
    __tablename__ = "lease_residents"
    lease_id = Column(UUID(as_uuid=True), ForeignKey("leases.id", ondelete="CASCADE"), primary_key=True)
    resident_id = Column(UUID(as_uuid=True), ForeignKey("residents.id"), primary_key=True)
    unit_assignment = Column(String)


class LeaseEvent(Base):
    __tablename__ = "lease_events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lease_id = Column(UUID(as_uuid=True), ForeignKey("leases.id"), nullable=False)
    event_type = Column(String, nullable=False)
    actor_type = Column(String, nullable=False)
    actor_id = Column(UUID(as_uuid=True))
    event_metadata = Column("metadata", JSONB, default=dict)
    occurred_at = Column(DateTime(timezone=True), server_default=func.now())


class Contract(Base):
    __tablename__ = "contracts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lease_id = Column(UUID(as_uuid=True), ForeignKey("leases.id"), nullable=False)
    contract_type = Column(String, nullable=False)  # NMA, NPA, individual_lease
    jurisdiction = Column(String, nullable=False)
    template_name = Column(String, nullable=False)
    body = Column(JSONB, nullable=False)
    parties = Column(JSONB, nullable=False)
    signed_at = Column(DateTime(timezone=True))
    signature_metadata = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
