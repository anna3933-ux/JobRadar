#!/usr/bin/env python3
"""
JobRadar Scraper
Скрапит вакансии с hh.ru и Хабр Карьера на основе настроек из SearchConfig
"""

import os
import sys
import json
import hashlib
import urllib.request
import urllib.parse
from datetime import datetime, timezone

BASE44_API_URL = os.environ.get("BASE44_API_URL", "")
BASE44_APP_ID = os.environ.get("BASE44_APP_ID", "")
BASE44_SERVICE_TOKEN = os.environ.get("BASE44_SERVICE_TOKEN", "")

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {BASE44_SERVICE_TOKEN}",
    "X-App-Id": BASE44_APP_ID,
}

def api_request(method, path, data=None):
    url = f"{BASE44_API_URL}/api/apps/{BASE44_APP_ID}/entities{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read().decode())
    except Exception as e:
        print(f"API error: {e}")
        return None

def get_search_config():
    result = api_request("GET", "/SearchConfig?limit=1")
    if result and len(result) > 0:
        return result[0]
    return None

def make_hash(title, company, source_platform):
    raw = f"{title}|{company}|{source_platform}".lower().strip()
    return hashlib.md5(raw.encode()).hexdigest()

def vacancy_exists(hash_val):
    result = api_request("GET", f"/Vacancy?hash={hash_val}&limit=1")
    return result and len(result) > 0

def save_vacancy(vacancy_data):
    return api_request("POST", "/Vacancy", vacancy_data)

def save_log(log_data):
    return api_request("POST", "/ScraperLog", log_data)

def scrape_hh(keywords, salary_from=None, employment_types=None, area_ids=None):
    """Скрапит вакансии через официальный API hh.ru"""
    vacancies = []
    
    area_map = {
        "Россия": 113,
        "Беларусь": 16,
        "Грузия": 28,
        "Армения": 1176,
        "Узбекистан": 97,
    }
    
    areas = area_ids or list(area_map.values())
    
    for keyword in keywords[:3]:  # max 3 keywords за раз
        for area_id in areas[:3]:  # max 3 страны
            params = {
                "text": keyword,
                "area": area_id,
                "per_page": 20,
                "page": 0,
                "order_by": "publication_time",
            }
            if salary_from:
                params["salary"] = salary_from
                params["only_with_salary"] = "true"
            
            url = "https://api.hh.ru/vacancies?" + urllib.parse.urlencode(params)
            headers = {"User-Agent": "JobRadar/1.0 (job search aggregator)"}
            
            try:
                req = urllib.request.Request(url, headers=headers)
                resp = urllib.request.urlopen(req, timeout=10)
                data = json.loads(resp.read().decode())
                
                for item in data.get("items", []):
                    salary = item.get("salary") or {}
                    area = item.get("area") or {}
                    employer = item.get("employer") or {}
                    schedule = item.get("schedule") or {}
                    
                    v = {
                        "title": item.get("name", ""),
                        "company": employer.get("name", ""),
                        "location": area.get("name", ""),
                        "country": area.get("name", ""),
                        "salary_from": salary.get("from"),
                        "salary_to": salary.get("to"),
                        "salary_currency": salary.get("currency", "RUB"),
                        "source_platform": "hh.ru",
                        "source_url": item.get("alternate_url", ""),
                        "published_at": item.get("published_at", "")[:10] if item.get("published_at") else "",
                        "employment_type": schedule.get("name", ""),
                        "status": "new",
                        "is_favorite": False,
                        "tags": [keyword],
                    }
                    v["hash"] = make_hash(v["title"], v["company"], "hh.ru")
                    vacancies.append(v)
                    
            except Exception as e:
                print(f"hh.ru scrape error (keyword={keyword}, area={area_id}): {e}")
    
    return vacancies

def scrape_habr(keywords):
    """Скрапит вакансии с Хабр Карьера"""
    vacancies = []
    
    for keyword in keywords[:3]:
        params = {
            "q": keyword,
            "page": 1,
        }
        url = "https://career.habr.com/vacancies?" + urllib.parse.urlencode(params)
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; JobRadar/1.0)",
            "Accept": "text/html",
        }
        
        try:
            req = urllib.request.Request(url, headers=headers)
            resp = urllib.request.urlopen(req, timeout=10)
            html = resp.read().decode("utf-8", errors="ignore")
            
            # Простой парсинг карточек вакансий
            import re
            
            # Ищем блоки вакансий
            pattern = r'vacancy-card__title.*?href="(/vacancies/\d+)"[^>]*>([^<]+)<'
            matches = re.findall(pattern, html, re.DOTALL)
            
            # Парсим компании
            company_pattern = r'vacancy-card__company-title[^>]*>([^<]+)<'
            companies = re.findall(company_pattern, html)
            
            for i, (path, title) in enumerate(matches[:10]):
                company = companies[i] if i < len(companies) else "Компания"
                v = {
                    "title": title.strip(),
                    "company": company.strip(),
                    "location": "Россия",
                    "country": "Россия",
                    "source_platform": "habr.career",
                    "source_url": f"https://career.habr.com{path}",
                    "status": "new",
                    "is_favorite": False,
                    "tags": [keyword],
                    "salary_currency": "RUB",
                }
                v["hash"] = make_hash(v["title"], v["company"], "habr.career")
                vacancies.append(v)
                
        except Exception as e:
            print(f"Habr scrape error (keyword={keyword}): {e}")
    
    return vacancies

def run():
    print(f"[{datetime.now().isoformat()}] JobRadar Scraper started")
    
    config = get_search_config()
    if not config:
        print("No SearchConfig found, using defaults")
        keywords = ["IT Project Manager", "Product Manager", "PM"]
        salary_from = None
    else:
        keywords = config.get("keywords", ["IT Project Manager"])
        salary_from = config.get("salary_from")
        print(f"Config loaded: keywords={keywords}")
    
    results = {}
    total_new = 0
    
    # Скрапим hh.ru
    started = datetime.now(timezone.utc).isoformat()
    print("Scraping hh.ru...")
    hh_vacancies = scrape_hh(keywords, salary_from)
    hh_new = 0
    for v in hh_vacancies:
        if not vacancy_exists(v["hash"]):
            if save_vacancy(v):
                hh_new += 1
    
    save_log({
        "started_at": started,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "platform": "hh.ru",
        "total_found": len(hh_vacancies),
        "new_added": hh_new,
        "status": "success",
        "keywords_used": ", ".join(keywords),
    })
    print(f"hh.ru: found={len(hh_vacancies)}, new={hh_new}")
    total_new += hh_new
    results["hh.ru"] = {"found": len(hh_vacancies), "new": hh_new}
    
    # Скрапим Хабр Карьера
    started = datetime.now(timezone.utc).isoformat()
    print("Scraping Habr Career...")
    habr_vacancies = scrape_habr(keywords)
    habr_new = 0
    for v in habr_vacancies:
        if not vacancy_exists(v["hash"]):
            if save_vacancy(v):
                habr_new += 1
    
    save_log({
        "started_at": started,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "platform": "habr.career",
        "total_found": len(habr_vacancies),
        "new_added": habr_new,
        "status": "success",
        "keywords_used": ", ".join(keywords),
    })
    print(f"Habr Career: found={len(habr_vacancies)}, new={habr_new}")
    total_new += habr_new
    results["habr.career"] = {"found": len(habr_vacancies), "new": habr_new}
    
    print(f"\n✅ Scraping complete. Total new vacancies: {total_new}")
    print(json.dumps(results, ensure_ascii=False))
    
    return total_new

if __name__ == "__main__":
    run()
