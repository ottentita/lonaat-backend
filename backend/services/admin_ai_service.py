"""
Admin AI Service - Core Automation Engine for LONAATE

This service handles:
1. Auto-Ads Runner - Automatically run ads for all entity types
2. Commission Monitoring - Scan and normalize commissions from affiliate networks
3. Task Logging - Track all AI task executions

ADMIN-ONLY: This service must NOT be exposed to normal users
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import threading

from models import (
    db, User, ImportedProduct, Product, Property, PropertyAd, AdBoost, 
    AIJob, Commission, CreditWallet
)


class AdminAIService:
    """Admin-only AI automation service"""
    
    _running_tasks: Dict[str, bool] = {}
    _task_lock = threading.Lock()
    
    @classmethod
    def is_task_running(cls, task_name: str) -> bool:
        with cls._task_lock:
            return cls._running_tasks.get(task_name, False)
    
    @classmethod
    def set_task_running(cls, task_name: str, running: bool):
        with cls._task_lock:
            cls._running_tasks[task_name] = running
    
    @classmethod
    def stop_all_tasks(cls):
        with cls._task_lock:
            for task_name in list(cls._running_tasks.keys()):
                cls._running_tasks[task_name] = False
    
    @staticmethod
    def create_task_log(
        admin_id: int,
        task_name: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None
    ) -> AIJob:
        """Create a new AI task log entry"""
        job = AIJob(
            user_id=admin_id,
            job_type=task_name,
            entity_type=entity_type,
            entity_id=entity_id,
            status='pending',
            created_at=datetime.utcnow()
        )
        db.session.add(job)
        db.session.commit()
        return job
    
    @staticmethod
    def update_task_log(
        job: AIJob,
        status: str,
        result: Optional[Dict] = None,
        error_message: Optional[str] = None
    ):
        """Update task log with results"""
        job.status = status
        if status == 'running':
            job.started_at = datetime.utcnow()
        elif status in ['completed', 'failed']:
            job.completed_at = datetime.utcnow()
        
        if result:
            job.result = json.dumps(result)
        if error_message:
            job.error_message = error_message
        
        db.session.commit()
    
    @classmethod
    def run_ads_for_products(cls, admin_id: int, product_ids: Optional[List[int]] = None) -> Dict:
        """
        Run ads for marketplace/affiliate products (both Product and ImportedProduct)
        Admin bypasses all credit checks - ads are FREE
        """
        task_name = 'run_ads_products'
        if cls.is_task_running(task_name):
            return {'error': 'Task already running', 'status': 'busy'}
        
        cls.set_task_running(task_name, True)
        job = cls.create_task_log(admin_id, task_name, 'product')
        cls.update_task_log(job, 'running')
        
        try:
            ads_created = 0
            ads_failed = 0
            ads_skipped = 0
            total_processed = 0
            
            if product_ids:
                marketplace_products = Product.query.filter(
                    Product.id.in_(product_ids),
                    Product.is_active == True
                ).all()
                imported_products = ImportedProduct.query.filter(
                    ImportedProduct.id.in_(product_ids),
                    ImportedProduct.is_active == True
                ).all()
            else:
                marketplace_products = Product.query.filter(Product.is_active == True).all()
                imported_products = ImportedProduct.query.filter(ImportedProduct.is_active == True).all()
            
            for product in marketplace_products:
                if not cls.is_task_running(task_name):
                    break
                
                total_processed += 1
                existing_ad = AdBoost.query.filter_by(
                    product_id=product.id,
                    status='active'
                ).first()
                
                if existing_ad:
                    ads_skipped += 1
                    continue
                
                try:
                    ad_boost = AdBoost(
                        user_id=product.user_id,
                        product_id=product.id,
                        boost_type='admin_auto',
                        boost_level=1,
                        credits_spent=0,
                        status='active',
                        started_at=datetime.utcnow(),
                        expires_at=datetime.utcnow() + timedelta(days=7)
                    )
                    db.session.add(ad_boost)
                    ads_created += 1
                except Exception as e:
                    ads_failed += 1
                    print(f"Failed to create ad for marketplace product {product.id}: {e}")
            
            for product in imported_products:
                if not cls.is_task_running(task_name):
                    break
                
                total_processed += 1
                existing_ad = AdBoost.query.filter_by(
                    imported_product_id=product.id,
                    status='active'
                ).first()
                
                if existing_ad:
                    ads_skipped += 1
                    continue
                
                try:
                    ad_boost = AdBoost(
                        user_id=product.user_id,
                        imported_product_id=product.id,
                        boost_type='admin_auto',
                        boost_level=1,
                        credits_spent=0,
                        status='active',
                        started_at=datetime.utcnow(),
                        expires_at=datetime.utcnow() + timedelta(days=7)
                    )
                    db.session.add(ad_boost)
                    ads_created += 1
                except Exception as e:
                    ads_failed += 1
                    print(f"Failed to create ad for imported product {product.id}: {e}")
            
            db.session.commit()
            
            result = {
                'marketplace_products': len(marketplace_products),
                'imported_products': len(imported_products),
                'total_processed': total_processed,
                'ads_created': ads_created,
                'ads_skipped': ads_skipped,
                'ads_failed': ads_failed,
                'stopped_early': not cls.is_task_running(task_name)
            }
            cls.update_task_log(job, 'completed', result)
            return result
            
        except Exception as e:
            error_msg = str(e)
            cls.update_task_log(job, 'failed', error_message=error_msg)
            db.session.rollback()
            return {'error': error_msg, 'status': 'failed'}
        
        finally:
            cls.set_task_running(task_name, False)
    
    @classmethod
    def run_ads_for_real_estate(cls, admin_id: int, property_ids: Optional[List[int]] = None) -> Dict:
        """
        Run ads for real estate listings
        Admin bypasses all credit checks - ads are FREE
        """
        task_name = 'run_ads_real_estate'
        if cls.is_task_running(task_name):
            return {'error': 'Task already running', 'status': 'busy'}
        
        cls.set_task_running(task_name, True)
        job = cls.create_task_log(admin_id, task_name, 'property')
        cls.update_task_log(job, 'running')
        
        try:
            if property_ids:
                properties = Property.query.filter(Property.id.in_(property_ids)).all()
            else:
                properties = Property.query.filter(
                    Property.status == 'approved',
                    Property.is_active == True
                ).all()
            
            ads_created = 0
            ads_failed = 0
            ads_skipped = 0
            
            for prop in properties:
                if not cls.is_task_running(task_name):
                    break
                
                existing_ad = PropertyAd.query.filter_by(
                    property_id=prop.id,
                    status='active'
                ).first()
                
                if existing_ad:
                    ads_skipped += 1
                    continue
                
                try:
                    property_ad = PropertyAd(
                        property_id=prop.id,
                        user_id=prop.user_id,
                        boost_level=1,
                        credits_spent=0,
                        status='active',
                        started_at=datetime.utcnow(),
                        expires_at=datetime.utcnow() + timedelta(days=7)
                    )
                    db.session.add(property_ad)
                    ads_created += 1
                except Exception as e:
                    ads_failed += 1
                    print(f"Failed to create ad for property {prop.id}: {e}")
            
            db.session.commit()
            
            result = {
                'properties_processed': len(properties),
                'ads_created': ads_created,
                'ads_skipped': ads_skipped,
                'ads_failed': ads_failed
            }
            cls.update_task_log(job, 'completed', result)
            return result
            
        except Exception as e:
            error_msg = str(e)
            cls.update_task_log(job, 'failed', error_message=error_msg)
            db.session.rollback()
            return {'error': error_msg, 'status': 'failed'}
        
        finally:
            cls.set_task_running(task_name, False)
    
    @classmethod
    def run_ads_for_all(cls, admin_id: int) -> Dict:
        """Run ads for all entity types (products + real estate)"""
        task_name = 'run_ads_all'
        if cls.is_task_running(task_name):
            return {'error': 'Task already running', 'status': 'busy'}
        
        cls.set_task_running(task_name, True)
        job = cls.create_task_log(admin_id, task_name)
        cls.update_task_log(job, 'running')
        
        try:
            products_result = cls._run_ads_products_internal(admin_id)
            real_estate_result = cls._run_ads_real_estate_internal(admin_id)
            
            result = {
                'products': products_result,
                'real_estate': real_estate_result,
                'total_ads_created': (
                    products_result.get('ads_created', 0) + 
                    real_estate_result.get('ads_created', 0)
                )
            }
            cls.update_task_log(job, 'completed', result)
            return result
            
        except Exception as e:
            error_msg = str(e)
            cls.update_task_log(job, 'failed', error_message=error_msg)
            return {'error': error_msg, 'status': 'failed'}
        
        finally:
            cls.set_task_running(task_name, False)
    
    @classmethod
    def _run_ads_products_internal(cls, admin_id: int) -> Dict:
        """Internal method to run product ads without task management (includes both types)"""
        marketplace_products = Product.query.filter(Product.is_active == True).all()
        imported_products = ImportedProduct.query.filter(ImportedProduct.is_active == True).all()
        
        ads_created = 0
        ads_skipped = 0
        
        for product in marketplace_products:
            existing_ad = AdBoost.query.filter_by(
                product_id=product.id,
                status='active'
            ).first()
            
            if existing_ad:
                ads_skipped += 1
                continue
            
            ad_boost = AdBoost(
                user_id=product.user_id,
                product_id=product.id,
                boost_type='admin_auto',
                boost_level=1,
                credits_spent=0,
                status='active',
                started_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
            db.session.add(ad_boost)
            ads_created += 1
        
        for product in imported_products:
            existing_ad = AdBoost.query.filter_by(
                imported_product_id=product.id,
                status='active'
            ).first()
            
            if existing_ad:
                ads_skipped += 1
                continue
            
            ad_boost = AdBoost(
                user_id=product.user_id,
                imported_product_id=product.id,
                boost_type='admin_auto',
                boost_level=1,
                credits_spent=0,
                status='active',
                started_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
            db.session.add(ad_boost)
            ads_created += 1
        
        db.session.commit()
        total = len(marketplace_products) + len(imported_products)
        return {'products_processed': total, 'ads_created': ads_created, 'ads_skipped': ads_skipped}
    
    @classmethod
    def _run_ads_real_estate_internal(cls, admin_id: int) -> Dict:
        """Internal method to run real estate ads without task management"""
        properties = Property.query.filter(
            Property.status == 'approved',
            Property.is_active == True
        ).all()
        
        ads_created = 0
        ads_skipped = 0
        
        for prop in properties:
            existing_ad = PropertyAd.query.filter_by(
                property_id=prop.id,
                status='active'
            ).first()
            
            if existing_ad:
                ads_skipped += 1
                continue
            
            property_ad = PropertyAd(
                property_id=prop.id,
                user_id=prop.user_id,
                boost_level=1,
                credits_spent=0,
                status='active',
                started_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
            db.session.add(property_ad)
            ads_created += 1
        
        db.session.commit()
        return {'properties_processed': len(properties), 'ads_created': ads_created, 'ads_skipped': ads_skipped}
    
    @classmethod
    def scan_commissions(cls, admin_id: int, networks: Optional[List[str]] = None) -> Dict:
        """
        Scan commissions from affiliate networks
        Fetches and normalizes commission data from integrated networks
        """
        task_name = 'scan_commissions'
        if cls.is_task_running(task_name):
            return {'error': 'Task already running', 'status': 'busy'}
        
        cls.set_task_running(task_name, True)
        job = cls.create_task_log(admin_id, task_name, 'commission')
        cls.update_task_log(job, 'running')
        
        if networks is None:
            networks = ['digistore24', 'awin', 'partnerstack']
        
        try:
            results = {
                'networks_scanned': [],
                'total_commissions_found': 0,
                'new_commissions': 0,
                'updated_commissions': 0,
                'errors': []
            }
            
            for network in networks:
                if not cls.is_task_running(task_name):
                    break
                
                try:
                    network_result = cls._scan_network_commissions(network)
                    results['networks_scanned'].append(network)
                    results['total_commissions_found'] += network_result.get('found', 0)
                    results['new_commissions'] += network_result.get('new', 0)
                    results['updated_commissions'] += network_result.get('updated', 0)
                except Exception as e:
                    results['errors'].append(f"{network}: {str(e)}")
            
            cls.update_task_log(job, 'completed', results)
            return results
            
        except Exception as e:
            error_msg = str(e)
            cls.update_task_log(job, 'failed', error_message=error_msg)
            return {'error': error_msg, 'status': 'failed'}
        
        finally:
            cls.set_task_running(task_name, False)
    
    @staticmethod
    def _scan_network_commissions(network: str) -> Dict:
        """Scan commissions from a specific network via API polling"""
        result = {'found': 0, 'new': 0, 'updated': 0}
        
        if network == 'digistore24':
            result = AdminAIService._poll_digistore24_commissions()
        elif network == 'awin':
            result = AdminAIService._poll_awin_commissions()
        elif network == 'partnerstack':
            result = AdminAIService._poll_partnerstack_commissions()
        
        return result
    
    @staticmethod
    def _poll_digistore24_commissions() -> Dict:
        """Poll Digistore24 API for commission updates"""
        import requests
        
        api_key = os.getenv('DIGISTORE_API_KEY')
        if not api_key:
            return {'found': 0, 'new': 0, 'updated': 0, 'status': 'no_api_key'}
        
        try:
            headers = {'Authorization': f'Bearer {api_key}'}
            response = requests.get(
                'https://www.digistore24.com/api/v1/commissions',
                headers=headers,
                timeout=30
            )
            
            if response.status_code != 200:
                return {'found': 0, 'new': 0, 'updated': 0, 'status': 'api_error'}
            
            data = response.json()
            commissions = data.get('commissions', [])
            
            new_count = 0
            updated_count = 0
            
            for comm_data in commissions:
                external_ref = comm_data.get('transaction_id') or comm_data.get('id')
                if not external_ref:
                    continue
                
                existing = Commission.query.filter_by(
                    network='digistore24',
                    external_ref=str(external_ref)
                ).first()
                
                new_status = AdminAIService._normalize_digistore_status(
                    comm_data.get('status', 'pending')
                )
                
                if existing:
                    if existing.status != new_status and new_status:
                        existing.status = new_status
                        updated_count += 1
                else:
                    new_count += 1
            
            db.session.commit()
            return {'found': len(commissions), 'new': new_count, 'updated': updated_count}
            
        except Exception as e:
            print(f"Digistore24 poll error: {e}")
            return {'found': 0, 'new': 0, 'updated': 0, 'error': str(e)}
    
    @staticmethod
    def _poll_awin_commissions() -> Dict:
        """Poll Awin API for commission updates"""
        import requests
        
        api_token = os.getenv('AWIN_TOKEN')
        publisher_id = os.getenv('AWIN_PUBLISHER_ID')
        
        if not api_token or not publisher_id:
            return {'found': 0, 'new': 0, 'updated': 0, 'status': 'no_api_key'}
        
        try:
            headers = {'Authorization': f'Bearer {api_token}'}
            end_date = datetime.utcnow().strftime('%Y-%m-%d')
            start_date = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
            
            response = requests.get(
                f'https://api.awin.com/publishers/{publisher_id}/transactions/',
                params={'startDate': start_date, 'endDate': end_date},
                headers=headers,
                timeout=30
            )
            
            if response.status_code != 200:
                return {'found': 0, 'new': 0, 'updated': 0, 'status': 'api_error'}
            
            transactions = response.json() or []
            
            new_count = 0
            updated_count = 0
            
            for trans in transactions:
                external_ref = trans.get('id') or trans.get('transactionId')
                if not external_ref:
                    continue
                
                existing = Commission.query.filter_by(
                    network='awin',
                    external_ref=str(external_ref)
                ).first()
                
                new_status = AdminAIService._normalize_awin_status(
                    trans.get('commissionStatus', {}).get('status', 'pending')
                )
                
                if existing:
                    if existing.status != new_status and new_status:
                        existing.status = new_status
                        updated_count += 1
                else:
                    new_count += 1
            
            db.session.commit()
            return {'found': len(transactions), 'new': new_count, 'updated': updated_count}
            
        except Exception as e:
            print(f"Awin poll error: {e}")
            return {'found': 0, 'new': 0, 'updated': 0, 'error': str(e)}
    
    @staticmethod
    def _poll_partnerstack_commissions() -> Dict:
        """Poll PartnerStack API for commission updates"""
        import requests
        
        api_key = os.getenv('PARTNERSTACK_API_KEY')
        if not api_key:
            return {'found': 0, 'new': 0, 'updated': 0, 'status': 'no_api_key'}
        
        try:
            headers = {'Authorization': f'Bearer {api_key}'}
            response = requests.get(
                'https://api.partnerstack.com/api/v2/transactions',
                headers=headers,
                timeout=30
            )
            
            if response.status_code != 200:
                return {'found': 0, 'new': 0, 'updated': 0, 'status': 'api_error'}
            
            data = response.json()
            transactions = data.get('data', [])
            
            new_count = 0
            updated_count = 0
            
            for trans in transactions:
                external_ref = trans.get('key') or trans.get('id')
                if not external_ref:
                    continue
                
                existing = Commission.query.filter_by(
                    network='partnerstack',
                    external_ref=str(external_ref)
                ).first()
                
                new_status = AdminAIService._normalize_partnerstack_status(
                    trans.get('status', 'pending')
                )
                
                if existing:
                    if existing.status != new_status and new_status:
                        existing.status = new_status
                        updated_count += 1
                else:
                    new_count += 1
            
            db.session.commit()
            return {'found': len(transactions), 'new': new_count, 'updated': updated_count}
            
        except Exception as e:
            print(f"PartnerStack poll error: {e}")
            return {'found': 0, 'new': 0, 'updated': 0, 'error': str(e)}
    
    @staticmethod
    def _normalize_digistore_status(status: str) -> str:
        """Normalize Digistore24 status to our standard"""
        status_map = {
            'pending': 'pending',
            'completed': 'approved',
            'approved': 'approved',
            'cancelled': 'rejected',
            'refunded': 'rejected',
            'paid': 'paid'
        }
        return status_map.get(status.lower(), 'pending')
    
    @staticmethod
    def _normalize_awin_status(status: str) -> str:
        """Normalize Awin status to our standard"""
        status_map = {
            'pending': 'pending',
            'approved': 'approved',
            'declined': 'rejected',
            'paid': 'paid'
        }
        return status_map.get(status.lower(), 'pending')
    
    @staticmethod
    def _normalize_partnerstack_status(status: str) -> str:
        """Normalize PartnerStack status to our standard"""
        status_map = {
            'pending': 'pending',
            'approved': 'approved',
            'rejected': 'rejected',
            'paid': 'paid',
            'completed': 'approved'
        }
        return status_map.get(status.lower(), 'pending')
    
    @staticmethod
    def get_ai_logs(
        limit: int = 50,
        status: Optional[str] = None,
        job_type: Optional[str] = None
    ) -> List[Dict]:
        """Get AI task logs for admin dashboard"""
        query = AIJob.query
        
        if status:
            query = query.filter_by(status=status)
        if job_type:
            query = query.filter_by(job_type=job_type)
        
        jobs = query.order_by(AIJob.created_at.desc()).limit(limit).all()
        return [job.to_dict() for job in jobs]
    
    @staticmethod
    def get_ai_stats() -> Dict:
        """Get AI system statistics"""
        total_jobs = AIJob.query.count()
        completed_jobs = AIJob.query.filter_by(status='completed').count()
        failed_jobs = AIJob.query.filter_by(status='failed').count()
        running_jobs = AIJob.query.filter_by(status='running').count()
        
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_jobs = AIJob.query.filter(AIJob.created_at >= today).count()
        
        return {
            'total_jobs': total_jobs,
            'completed_jobs': completed_jobs,
            'failed_jobs': failed_jobs,
            'running_jobs': running_jobs,
            'today_jobs': today_jobs,
            'success_rate': round((completed_jobs / total_jobs * 100) if total_jobs > 0 else 0, 2)
        }
    
    @staticmethod
    def auto_run_ad_on_entity_create(entity_type: str, entity_id: int, user_id: int):
        """
        Auto-trigger ad creation when a new entity is created
        Called after product import, real estate listing creation, etc.
        
        Only admin entities get auto-ads (free)
        """
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return None
        
        if entity_type == 'product':
            ad_boost = AdBoost(
                user_id=user_id,
                product_id=entity_id,
                boost_type='admin_auto',
                boost_level=1,
                credits_spent=0,
                status='active',
                started_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
            db.session.add(ad_boost)
            db.session.commit()
            return ad_boost.id
        
        elif entity_type == 'property':
            property_ad = PropertyAd(
                property_id=entity_id,
                user_id=user_id,
                boost_level=1,
                credits_spent=0,
                status='active',
                started_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
            db.session.add(property_ad)
            db.session.commit()
            return property_ad.id
        
        return None


def get_admin_ai_service():
    """Get the Admin AI Service instance"""
    return AdminAIService
