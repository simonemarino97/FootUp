#!/usr/bin/env python3
"""
FOOTUP Backend Testing - Focused test for club membership
"""
import requests
import random
from pymongo import MongoClient
import os
from uuid import uuid4
import time

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://kick-off-app-1.preview.emergentagent.com') + '/api'
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'footup')

print(f"Testing against: {BASE_URL}\n")

def random_email():
    first = ['james', 'john', 'robert', 'michael', 'william']
    last = ['smith', 'johnson', 'williams', 'brown', 'jones']
    return f"{random.choice(first)}.{random.choice(last)}{random.randint(1000,9999)}@gmail.com"

def register_user(session, name):
    email = random_email()
    resp = session.post(f"{BASE_URL}/auth/register", json={'email': email, 'password': 'Pass123!', 'name': name})
    if resp.status_code != 200:
        print(f"❌ Registration failed: {resp.status_code}")
        return None
    print(f"✅ Registered {name}")
    return resp.json()

def get_me(session):
    resp = session.get(f"{BASE_URL}/auth/me")
    return resp.json() if resp.status_code == 200 else None

print("="*60)
print("FOCUSED BACKEND TEST - Club Membership & Join Requests")
print("="*60)

# Test 1: Club membership model
print("\n1. Testing club membership model...")
captain_a = requests.Session()
player_p1 = requests.Session()

register_user(captain_a, "Captain A")
register_user(player_p1, "Player P1")

# Check P1 is free_agent
me_p1 = get_me(player_p1)
assert me_p1['role'] == 'free_agent', f"P1 should be free_agent, got {me_p1['role']}"
print("✅ P1 is free_agent initially")

# Captain A creates team
team_resp = captain_a.post(f"{BASE_URL}/teams", json={'name': 'Alpha FC', 'city': 'London'})
assert team_resp.status_code == 200, f"Team creation failed: {team_resp.status_code}"
team_a = team_resp.json()['team']
print(f"✅ Captain A created team")

# Check A is captain
me_a = get_me(captain_a)
assert me_a['role'] == 'captain', f"A should be captain, got {me_a['role']}"
print("✅ Captain A has role=captain")

# A tries to create second team -> 409
team2_resp = captain_a.post(f"{BASE_URL}/teams", json={'name': 'Beta FC'})
assert team2_resp.status_code == 409, f"Second team should return 409, got {team2_resp.status_code}"
print("✅ Captain A cannot create second team (409)")

# Test 2: Join requests
print("\n2. Testing join requests...")
jr_resp = player_p1.post(f"{BASE_URL}/teams/{team_a['id']}/join-request", json={'message': 'Join!', 'position': 'FWD', 'jersey_number': 9})
assert jr_resp.status_code == 200, f"Join request failed: {jr_resp.status_code}"
jr = jr_resp.json()['request']
print("✅ P1 sent join request")

# Duplicate request -> 409
dup_resp = player_p1.post(f"{BASE_URL}/teams/{team_a['id']}/join-request", json={'message': 'Again'})
assert dup_resp.status_code == 409, f"Duplicate should return 409, got {dup_resp.status_code}"
print("✅ Duplicate join request returns 409")

# Captain A sees pending request
jrs_resp = captain_a.get(f"{BASE_URL}/teams/{team_a['id']}/join-requests")
assert jrs_resp.status_code == 200 and len(jrs_resp.json()['requests']) == 1
print("✅ Captain A sees 1 pending request")

# P1 cannot view requests -> 403
p1_jrs = player_p1.get(f"{BASE_URL}/teams/{team_a['id']}/join-requests")
assert p1_jrs.status_code == 403, f"P1 should get 403, got {p1_jrs.status_code}"
print("✅ P1 cannot view requests (403)")

# Captain A accepts
accept_resp = captain_a.post(f"{BASE_URL}/join-requests/{jr['id']}/accept")
assert accept_resp.status_code == 200, f"Accept failed: {accept_resp.status_code}"
print("✅ Captain A accepted P1")

# P1 is now player
me_p1 = get_me(player_p1)
assert me_p1['role'] == 'player', f"P1 should be player, got {me_p1['role']}"
print("✅ P1 is now player")

# Team has 2 members
team_resp = captain_a.get(f"{BASE_URL}/teams/{team_a['id']}")
members = team_resp.json()['members']
assert len(members) == 2, f"Team should have 2 members, got {len(members)}"
print("✅ Team has 2 members")

# P1 cannot create team -> 409
p1_team = player_p1.post(f"{BASE_URL}/teams", json={'name': 'P1 Team'})
assert p1_team.status_code == 409, f"P1 create team should return 409, got {p1_team.status_code}"
print("✅ P1 cannot create team (409)")

# Test 3: Captain-only permissions
print("\n3. Testing captain-only permissions...")
update_resp = player_p1.put(f"{BASE_URL}/teams/{team_a['id']}", json={'name': 'Hacked'})
assert update_resp.status_code == 403, f"P1 update should return 403, got {update_resp.status_code}"
print("✅ P1 cannot update team (403)")

ch_resp = player_p1.post(f"{BASE_URL}/challenges", json={'football_type': '5'})
assert ch_resp.status_code == 403, f"P1 challenge should return 403, got {ch_resp.status_code}"
print("✅ P1 cannot create challenge (403)")

post_resp = player_p1.post(f"{BASE_URL}/posts", json={'content': 'Hello!'})
assert post_resp.status_code == 200, f"P1 post should return 200, got {post_resp.status_code}"
print("✅ P1 can create post (200)")

# Test 4: Player profile & discover
print("\n4. Testing player profiles...")
profile_resp = player_p1.put(f"{BASE_URL}/me/profile", json={'jersey_number': 10, 'position': 'MID', 'bio': 'Midfielder'})
assert profile_resp.status_code == 200, f"Profile update failed: {profile_resp.status_code}"
print("✅ P1 updated profile")

p1_id = me_p1['user']['id']
player_resp = requests.get(f"{BASE_URL}/players/{p1_id}")
assert player_resp.status_code == 200
player_data = player_resp.json()
assert player_data['player']['status'] == 'club_member', f"Status should be club_member, got {player_data['player']['status']}"
print("✅ GET /players/:id shows club_member")

# Test 5: Kit customization
print("\n5. Testing kit customization...")
kit_resp = captain_a.put(f"{BASE_URL}/teams/{team_a['id']}", json={
    'kit': {
        'home': {'shirt': '#ff0000', 'pattern': 'stripes'},
        'away': {'shirt': 'bad_hex', 'pattern': 'invalid'}
    }
})
assert kit_resp.status_code == 200
kit = kit_resp.json()['team']['kit']
assert kit['home']['shirt'] == '#ff0000' and kit['home']['pattern'] == 'stripes'
assert kit['away']['shirt'] == '#10b981' and kit['away']['pattern'] == 'solid'
print("✅ Kit sanitization working (invalid hex/pattern replaced)")

# Test recruiting flag
recruit_resp = captain_a.put(f"{BASE_URL}/teams/{team_a['id']}", json={'recruiting': False})
assert recruit_resp.status_code == 200
print("✅ Set recruiting=false")

player_p2 = requests.Session()
register_user(player_p2, "Player P2")
jr_blocked = player_p2.post(f"{BASE_URL}/teams/{team_a['id']}/join-request", json={'message': 'Join?'})
assert jr_blocked.status_code == 400, f"Should return 400, got {jr_blocked.status_code}"
print("✅ Join request blocked when recruiting=false (400)")

# Test 6: Transfer captain & leave
print("\n6. Testing transfer captain & leave...")
transfer_resp = captain_a.post(f"{BASE_URL}/teams/{team_a['id']}/transfer-captain", json={'user_id': p1_id})
assert transfer_resp.status_code == 200
print("✅ Transferred captaincy to P1")

me_p1 = get_me(player_p1)
assert me_p1['role'] == 'captain', f"P1 should be captain, got {me_p1['role']}"
print("✅ P1 is now captain")

me_a = get_me(captain_a)
assert me_a['role'] == 'player', f"A should be player, got {me_a['role']}"
print("✅ A is now player")

leave_resp = captain_a.post(f"{BASE_URL}/me/leave-club")
assert leave_resp.status_code == 200
print("✅ A left the club")

me_a = get_me(captain_a)
assert me_a['role'] == 'free_agent', f"A should be free_agent, got {me_a['role']}"
print("✅ A is now free_agent")

p1_leave = player_p1.post(f"{BASE_URL}/me/leave-club")
assert p1_leave.status_code == 400, f"Captain leave should return 400, got {p1_leave.status_code}"
print("✅ P1 (captain) cannot leave (400)")

# Test 7: Legacy backfill
print("\n7. Testing legacy backfill...")
legacy_user = requests.Session()
register_user(legacy_user, "Legacy Captain")
legacy_id = get_me(legacy_user)['user']['id']

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
legacy_team_id = str(uuid4())
db.teams.insert_one({
    'id': legacy_team_id, 'captain_id': legacy_id, 'name': 'Legacy Team', 'city': 'London',
    'rating': 1000, 'wins': 0, 'draws': 0, 'losses': 0, 'goals_for': 0, 'goals_against': 0,
    'streak': 0, 'best_streak': 0, 'matches_played': 0, 'followers': [], 'achievements': [],
    'last_matches': [], 'recruiting': True, 'primary_color': '#10b981', 'secondary_color': '#0ea5e9',
    'football_type': 'both', 'created_at': None
})
print("✅ Inserted legacy team in Mongo (no club_members)")

me_legacy = get_me(legacy_user)
assert me_legacy['role'] == 'captain', f"Legacy user should be captain, got {me_legacy['role']}"
print("✅ Legacy user /auth/me returns captain (backfilled)")

member_entry = db.club_members.find_one({'user_id': legacy_id, 'club_id': legacy_team_id})
assert member_entry and member_entry['role'] == 'captain'
print("✅ club_members entry auto-created")

# Test 8: Regression - Challenge->Match->ELO
print("\n8. Testing challenge->match->ELO regression...")
cap_x = requests.Session()
cap_y = requests.Session()
register_user(cap_x, "Captain X")
register_user(cap_y, "Captain Y")

team_x = cap_x.post(f"{BASE_URL}/teams", json={'name': 'Team X', 'city': 'London'}).json()['team']
team_y = cap_y.post(f"{BASE_URL}/teams", json={'name': 'Team Y', 'city': 'London'}).json()['team']
print("✅ Created Team X and Y")

challenge = cap_x.post(f"{BASE_URL}/challenges", json={'football_type': '5', 'city': 'London'}).json()['challenge']
match = cap_y.post(f"{BASE_URL}/challenges/{challenge['id']}/accept").json()['match']
print("✅ Challenge created and accepted")

conf_x = cap_x.post(f"{BASE_URL}/matches/{match['id']}/confirm", json={'score_home': 3, 'score_away': 1})
assert conf_x.json()['match']['status'] == 'pending'
print("✅ First confirm: status=pending")

conf_y = cap_y.post(f"{BASE_URL}/matches/{match['id']}/confirm", json={'score_home': 3, 'score_away': 1})
assert conf_y.json()['match']['status'] == 'confirmed'
print("✅ Second confirm: status=confirmed")

team_x_after = cap_x.get(f"{BASE_URL}/teams/{team_x['id']}").json()['team']
team_y_after = cap_y.get(f"{BASE_URL}/teams/{team_y['id']}").json()['team']
assert team_x_after['rating'] > 1000, f"Team X rating should increase, got {team_x_after['rating']}"
assert team_y_after['rating'] < 1000, f"Team Y rating should decrease, got {team_y_after['rating']}"
print(f"✅ ELO updated: X={team_x_after['rating']}, Y={team_y_after['rating']}")

# Test 9: Player cannot accept challenge/confirm match
print("\n9. Testing player cannot accept challenge/confirm match...")
player_new = requests.Session()
register_user(player_new, "Player New")
jr_new = player_new.post(f"{BASE_URL}/teams/{team_y['id']}/join-request", json={'message': 'Join'})
cap_y.post(f"{BASE_URL}/join-requests/{jr_new.json()['request']['id']}/accept")
print("✅ Player New joined Team Y")

cap_z = requests.Session()
register_user(cap_z, "Captain Z")
team_z = cap_z.post(f"{BASE_URL}/teams", json={'name': 'Team Z'}).json()['team']
ch_z = cap_z.post(f"{BASE_URL}/challenges", json={'football_type': '5'}).json()['challenge']

accept_player = player_new.post(f"{BASE_URL}/challenges/{ch_z['id']}/accept")
assert accept_player.status_code == 403, f"Player accept should return 403, got {accept_player.status_code}"
print("✅ Player cannot accept challenge (403)")

match_z = cap_y.post(f"{BASE_URL}/challenges/{ch_z['id']}/accept").json()['match']
conf_player = player_new.post(f"{BASE_URL}/matches/{match_z['id']}/confirm", json={'score_home': 2, 'score_away': 2})
assert conf_player.status_code == 403, f"Player confirm should return 403, got {conf_player.status_code}"
print("✅ Player cannot confirm match (403)")

# Test 10: PRO removal
print("\n10. Testing PRO removal...")
removed_endpoints = ['/subscription/status', '/subscription/checkout']
for endpoint in removed_endpoints:
    resp = requests.get(f"{BASE_URL}{endpoint}")
    assert resp.status_code == 404, f"{endpoint} should return 404, got {resp.status_code}"
print("✅ Removed endpoints return 404")

stats_resp = requests.get(f"{BASE_URL}/teams/{team_x['id']}/advanced-stats")
assert stats_resp.status_code == 200, f"Advanced stats should return 200, got {stats_resp.status_code}"
print("✅ Advanced stats returns 200 for any team")

print("\n" + "="*60)
print("ALL TESTS PASSED ✅")
print("="*60)
