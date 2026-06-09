TEMPLATES = {
    "US-TN": {
        "template_id": "us-tn-corporate-housing-v1",
        "jurisdiction": "US-TN",
        "clauses": [
            {"title": "Term", "text": "Lessee shall occupy the Premises for the term specified herein. This Agreement is a corporate housing lease governed by Tennessee Code Annotated § 66-28 et seq."},
            {"title": "Rent", "text": "Monthly rent shall be due on the first (1st) day of each calendar month. Lessee agrees to pay rent via ACH transfer to the account designated by Lessor."},
            {"title": "Security Deposit", "text": "A security deposit equal to one (1) month's rent shall be held in escrow pursuant to T.C.A. § 66-28-301. Lessor shall return the deposit within thirty (30) days of lease termination."},
            {"title": "Use of Premises", "text": "The Premises shall be used solely for residential purposes. Lessee agrees to comply with all applicable zoning ordinances and HOA rules."},
            {"title": "Maintenance", "text": "Lessor shall maintain the Premises in habitable condition per T.C.A. § 66-28-304. Lessee shall promptly report any damage or needed repairs."},
            {"title": "Corporate Assignment", "text": "This lease is entered into by the corporate entity listed as Buyer on behalf of the named resident(s). The corporate entity remains liable for rent regardless of individual occupancy changes."},
            {"title": "Governing Law", "text": "This Agreement shall be governed by the laws of the State of Tennessee. Any disputes shall be resolved in the courts of Davidson County, Tennessee."}
        ],
        "jurisdiction_specific": {
            "state_law_reference": "TN Code § 66-28",
            "required_disclosures": [
                "Lead-based paint disclosure (pre-1978 properties)",
                "Landlord identity disclosure per T.C.A. § 66-28-302",
                "Move-in inspection checklist required"
            ]
        }
    },
    "US-CA": {
        "template_id": "us-ca-corporate-housing-v1",
        "jurisdiction": "US-CA",
        "clauses": [
            {"title": "Term", "text": "This Corporate Housing Agreement is entered pursuant to California Civil Code § 1940 et seq. For stays exceeding 30 days, tenant protections under AB 1482 may apply."},
            {"title": "Rent", "text": "Monthly rent is due on the first of each month. Per California law, there is no grace period unless expressly stated. Late fees are capped at 5% of monthly rent."},
            {"title": "Security Deposit", "text": "Security deposit shall not exceed two (2) months' rent for unfurnished units or three (3) months' rent for furnished units per Civil Code § 1950.5."},
            {"title": "Just Cause Eviction", "text": "If the property is subject to AB 1482, Lessor may only terminate tenancy for just cause as defined in Civil Code § 1946.2."},
            {"title": "Habitability", "text": "Lessor warrants the Premises meets the implied warranty of habitability under Civil Code § 1941."},
            {"title": "Corporate Assignment", "text": "This lease is a corporate housing arrangement. The corporate entity is the primary leaseholder responsible for all financial obligations."},
            {"title": "Governing Law", "text": "This Agreement is governed by California law. Disputes shall be resolved in the county where the Premises are located."}
        ],
        "jurisdiction_specific": {
            "state_law_reference": "CA Civil Code § 1940",
            "required_disclosures": [
                "AB 1482 just cause eviction notice",
                "Mold disclosure per Health & Safety Code § 26147",
                "Bedbug disclosure per Civil Code § 1954.603",
                "Smoking policy disclosure"
            ]
        }
    },
    "US-TX": {
        "template_id": "us-tx-corporate-housing-v1",
        "jurisdiction": "US-TX",
        "clauses": [
            {"title": "Term", "text": "This Corporate Housing Lease is governed by the Texas Property Code Chapter 92. The lease term is as specified herein and shall not automatically renew without written agreement."},
            {"title": "Rent", "text": "Rent is due on the first of each month. Texas law does not mandate a grace period; however, Lessor agrees to a 3-day grace period before assessing late charges."},
            {"title": "Security Deposit", "text": "Security deposit shall be returned within thirty (30) days of lease termination per Texas Property Code § 92.103."},
            {"title": "Repairs", "text": "Lessor shall make repairs within a reasonable time after notice. Tenant remedies per Texas Property Code § 92.056 apply."},
            {"title": "Corporate Assignment", "text": "The corporate entity listed as Buyer is the primary obligor under this lease. Individual residents are authorized occupants, not tenants of record."},
            {"title": "Governing Law", "text": "This Agreement shall be governed by the laws of the State of Texas. Venue shall be in the county where the property is located."}
        ],
        "jurisdiction_specific": {
            "state_law_reference": "TX Property Code Chapter 92",
            "required_disclosures": [
                "Lead-based paint disclosure (pre-1978 properties)",
                "Right to repair and deduct notice",
                "Sex offender registry notice per § 92.0135"
            ]
        }
    },
    "US-NY": {
        "template_id": "us-ny-corporate-housing-v1",
        "jurisdiction": "US-NY",
        "clauses": [
            {"title": "Term", "text": "This Corporate Housing Agreement is governed by New York Real Property Law. Corporate housing arrangements may qualify as transient occupancy if under 30 consecutive days."},
            {"title": "Rent", "text": "Monthly rent is due on the first. New York law prohibits late fees exceeding $50 or 5% of monthly rent, whichever is less, for units subject to rent stabilization."},
            {"title": "Security Deposit", "text": "Security deposit is limited to one (1) month's rent per the Housing Stability and Tenant Protection Act of 2019. Must be returned within 14 days of vacancy."},
            {"title": "Warranty of Habitability", "text": "Lessor warrants the Premises is and shall remain fit for human habitation per Real Property Law § 235-b."},
            {"title": "Corporate Lease Structure", "text": "This is a corporate lease. The named corporate entity assumes full financial responsibility. Individual residents receive occupancy rights as licensees of the corporate tenant."},
            {"title": "Governing Law", "text": "This Agreement is governed by New York law. Disputes shall be resolved in the appropriate New York court."}
        ],
        "jurisdiction_specific": {
            "state_law_reference": "NY Real Property Law § 220",
            "required_disclosures": [
                "Truth in Renting Act disclosure",
                "NYC lead paint disclosure (if applicable)",
                "Bedbug infestation history disclosure",
                "NYC Housing Court information"
            ]
        }
    },
    "US-MA": {
        "template_id": "us-ma-corporate-housing-v1",
        "jurisdiction": "US-MA",
        "clauses": [
            {"title": "Term", "text": "This Corporate Housing Lease is governed by Massachusetts General Laws Chapter 186. The term is specified herein. Corporate housing of 90 days or less may qualify as transient lodging."},
            {"title": "Rent", "text": "Rent is due on the first of each month. Massachusetts law mandates a 30-day notice before rent increases for month-to-month tenancies."},
            {"title": "Security Deposit", "text": "Security deposit shall not exceed one month's rent per M.G.L. c. 186 § 15B. Must be held in interest-bearing account and returned within 30 days of tenancy end."},
            {"title": "Habitability", "text": "Lessor shall maintain the Premises in compliance with the Massachusetts Sanitary Code (105 CMR 410.000)."},
            {"title": "Corporate Assignment", "text": "The corporate entity is the named tenant. Individual occupants are sublicensees of the corporate tenant with no independent tenancy rights."},
            {"title": "Governing Law", "text": "This Agreement is governed by Massachusetts law. Disputes shall be resolved in the appropriate Massachusetts court."}
        ],
        "jurisdiction_specific": {
            "state_law_reference": "M.G.L. c. 186",
            "required_disclosures": [
                "Lead paint inspection disclosure (pre-1978)",
                "Last 12 months rental payment record",
                "Sanitary Code compliance statement"
            ]
        }
    },
    "US-FL": {
        "template_id": "us-fl-corporate-housing-v1",
        "jurisdiction": "US-FL",
        "clauses": [
            {"title": "Term", "text": "This Corporate Housing Lease is governed by Florida Statute Chapter 83. For stays of 6 months or less, this may qualify as transient lodging subject to Florida's Transient Occupancy Tax."},
            {"title": "Rent", "text": "Rent is due on the first of each month. Florida law provides a 3-day notice to pay or vacate. Late fees must be reasonable and specified in the lease."},
            {"title": "Security Deposit", "text": "Security deposit must be returned within 15 days if no deductions, or 30 days with itemized deductions, per F.S. § 83.49."},
            {"title": "Habitability", "text": "Lessor shall maintain the Premises in compliance with applicable building, housing, and health codes per F.S. § 83.51."},
            {"title": "Corporate Assignment", "text": "The corporate entity assumes all financial obligations. Named residents are authorized occupants under the corporate tenancy."},
            {"title": "Governing Law", "text": "This Agreement shall be governed by Florida law. Venue is in the county where the Premises are located."}
        ],
        "jurisdiction_specific": {
            "state_law_reference": "FL Statute Chapter 83",
            "required_disclosures": [
                "Radon gas disclosure per F.S. § 404.056",
                "Hurricane shutter information",
                "Lead paint disclosure (pre-1978 properties)"
            ]
        }
    },
    "US-DEFAULT": {
        "template_id": "us-default-corporate-housing-v1",
        "jurisdiction": "US-DEFAULT",
        "clauses": [
            {"title": "Term", "text": "This Corporate Housing Agreement covers the period specified herein. STATE-SPECIFIC CLAUSES REQUIRED — consult local counsel before execution."},
            {"title": "Rent", "text": "Monthly rent is due on the first of each month. Specific late fee and grace period provisions vary by state and must be confirmed."},
            {"title": "Security Deposit", "text": "Security deposit terms vary by state. Maximum amounts and return timelines must conform to applicable state law."},
            {"title": "Corporate Assignment", "text": "This lease is entered by the corporate entity as primary obligor. Individual residents are authorized occupants."},
            {"title": "Governing Law", "text": "This Agreement shall be governed by the laws of the state where the Premises are located."}
        ],
        "jurisdiction_specific": {
            "state_law_reference": "State-specific — review required",
            "required_disclosures": ["State-specific disclosures required — review with local counsel"]
        }
    },
    "FR-BAIL-MOBILITE": {
        "template_id": "fr-bail-mobilite-v1",
        "jurisdiction": "FR-BAIL-MOBILITE",
        "clauses": [
            {"title": "Nature du contrat", "text": "Le présent contrat est un bail mobilité régi par la loi n° 89-462 du 6 juillet 1989, articles 25-12 à 25-18, tel que modifié par la loi ELAN du 23 novembre 2018."},
            {"title": "Durée", "text": "Le bail mobilité est conclu pour une durée de 1 à 10 mois, non renouvelable et non reconductible. Durée spécifiée aux conditions particulières."},
            {"title": "Loyer", "text": "Le loyer mensuel est fixé aux conditions particulières. En zone tendue, le loyer de référence majoré s'applique conformément à l'encadrement des loyers."},
            {"title": "Dépôt de garantie", "text": "Aucun dépôt de garantie ne peut être exigé dans le cadre d'un bail mobilité (article 25-18 de la loi du 6 juillet 1989)."},
            {"title": "Conditions d'éligibilité", "text": "Le locataire doit justifier d'une des situations prévues à l'article 25-12: formation professionnelle, études supérieures, contrat d'apprentissage, stage, engagement volontaire en service civique, mutation professionnelle, ou mission temporaire."},
            {"title": "Résiliation", "text": "Le locataire peut résilier le bail à tout moment avec un préavis d'un mois. Le bailleur ne peut résilier le bail avant son terme."}
        ],
        "jurisdiction_specific": {
            "state_law_reference": "Loi n° 89-462 du 6 juillet 1989, articles 25-12 à 25-18",
            "required_disclosures": [
                "Notice d'information sur le bail mobilité",
                "État des lieux d'entrée obligatoire",
                "Diagnostic de performance énergétique (DPE)"
            ]
        }
    },
    "DE-BOARDINGHOUSE": {
        "template_id": "de-boardinghouse-v1",
        "jurisdiction": "DE-BOARDINGHOUSE",
        "clauses": [
            {"title": "Vertragsgegenstand", "text": "Dieser Vertrag regelt die Nutzung eines möblierten Boardinghouse-Zimmers für einen Zeitraum von bis zu 90 Tagen. Boardinghouse-Verträge werden nicht als Mietverhältnisse gemäß BGB § 535 ff. eingestuft."},
            {"title": "Nutzungsentgelt", "text": "Das monatliche Nutzungsentgelt ist im Voraus zu entrichten. Eine Mietpreisbremse (§ 556d BGB) gilt nicht für Boardinghouse-Verträge."},
            {"title": "Kaution", "text": "Eine Kaution in Höhe von maximal zwei Monatsentgelten kann vereinbart werden."},
            {"title": "Kündigung", "text": "Der Vertrag endet automatisch nach Ablauf der vereinbarten Dauer. Eine vorzeitige Kündigung ist mit einer Frist von 14 Tagen möglich."},
            {"title": "Leistungen", "text": "Im Nutzungsentgelt enthaltene Leistungen: Reinigung, WLAN, Bettwäsche, Handtücher, Rezeptionsdienst (Details laut Besondere Vereinbarungen)."},
            {"title": "Geltendes Recht", "text": "Dieser Vertrag unterliegt deutschem Recht. Gerichtsstand ist der Ort der Unterkunft."}
        ],
        "jurisdiction_specific": {
            "state_law_reference": "BGB §§ 535 ff. (nicht anwendbar als Mietvertrag); Beherbergungsrecht",
            "required_disclosures": [
                "Energieausweis (falls erforderlich)",
                "Hausordnung",
                "DSGVO-Datenschutzerklärung"
            ]
        }
    },
    "UK-CORPORATE-LET": {
        "template_id": "uk-corporate-let-v1",
        "jurisdiction": "UK-CORPORATE-LET",
        "clauses": [
            {"title": "Tenancy Type", "text": "This is a corporate let agreement. The Tenant is a corporate entity and the occupants are its employees or contractors. This agreement is not an assured shorthold tenancy under the Housing Act 1988."},
            {"title": "Term", "text": "The tenancy commences on the date specified and continues for the fixed term stated. Thereafter it shall continue on a rolling monthly basis unless terminated by either party giving one month's written notice."},
            {"title": "Rent", "text": "Rent is due monthly in advance on the specified date. VAT will be charged where applicable. The corporate tenant is responsible for all rent payments."},
            {"title": "Deposit", "text": "A deposit equivalent to six weeks' rent shall be held. As this is a corporate let, the Tenancy Deposit Scheme regulations do not apply, but the deposit will be held in a designated client account."},
            {"title": "Occupancy", "text": "The property shall be occupied only by the authorised occupants named herein as employees or contractors of the corporate tenant. The corporate tenant must notify the Landlord of any change in occupants."},
            {"title": "Governing Law", "text": "This Agreement is governed by the law of England and Wales. Disputes shall be referred to the courts of England and Wales."}
        ],
        "jurisdiction_specific": {
            "state_law_reference": "Housing Act 1988; Landlord and Tenant Act 1954 (commercial provisions)",
            "required_disclosures": [
                "Energy Performance Certificate (EPC) rating E or above required",
                "Gas Safety Certificate (annual)",
                "Electrical Installation Condition Report (EICR)",
                "How to Rent guide (residential occupants)"
            ]
        }
    },
    "INTERNATIONAL-DEFAULT": {
        "template_id": "international-default-v1",
        "jurisdiction": "INTERNATIONAL-DEFAULT",
        "clauses": [
            {"title": "Bespoke Legal Review Required", "text": "NOTICE: This jurisdiction requires bespoke legal review before execution. This template serves as a placeholder only. The parties must obtain independent legal advice from qualified counsel in the relevant jurisdiction."},
            {"title": "Term", "text": "The occupancy period is as specified in the particulars. Local law may impose minimum or maximum term requirements."},
            {"title": "Financial Terms", "text": "Rent and deposit terms are as specified. Local law governs permissible deposit amounts, return timelines, and any rent control provisions."},
            {"title": "Compliance", "text": "Both parties agree to comply with all applicable local laws, regulations, and ordinances governing residential occupancy in the jurisdiction where the premises are located."},
            {"title": "Governing Law", "text": "This Agreement is governed by the laws of the jurisdiction where the Premises are located. Local mandatory provisions shall supersede any conflicting terms herein."}
        ],
        "jurisdiction_specific": {
            "state_law_reference": "Local law — bespoke review required",
            "required_disclosures": ["All locally required disclosures must be confirmed with local counsel"]
        }
    }
}


def get_template(jurisdiction: str) -> dict:
    return TEMPLATES.get(jurisdiction, TEMPLATES["US-DEFAULT"])
