"""
Budget Allocator
Allocates budgets for campaigns based on performance and strategy.
"""
import logging

class BudgetAllocator:
    def __init__(self):
        self.budget_history = {}

    def allocate(self, campaign_data):
        # Example: allocate based on campaign type or performance
        base_budget = 1000
        if campaign_data.get("priority"):
            base_budget *= 2
        campaign_id = campaign_data.get("id", "unknown")
        self.budget_history[campaign_id] = base_budget
        logging.info(f"Budget allocated for {campaign_id}: {base_budget}")
        return {"budget": base_budget, "campaign": campaign_data}

    def reallocate(self, campaign_id, new_amount):
        self.budget_history[campaign_id] = new_amount
        logging.info(f"Budget reallocated for {campaign_id}: {new_amount}")
        return {"budget": new_amount, "campaign_id": campaign_id}
