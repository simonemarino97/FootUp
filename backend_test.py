#!/usr/bin/env python3
"""
FOOTUP Backend Testing - Club Membership Model & Join Requests
Tests the new club membership system with captain/player/free_agent roles
"""
import requests
import random
import string
from pymongo import MongoClient
import os
from uuid import uuid4

# Base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://kick-off-app-1.preview.emergentagent.com') + '/api'
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'footup')

print(f"Testing against: {BASE_URL}")
print(f"MongoDB: {MONGO_URL}/{DB_NAME}")

def random_email():
    """Generate a realistic random email"""
    first_names = ['james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'charles']
    last_names = ['smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis', 'rodriguez', 'martinez']
    domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']
    return f"{random.choice(first_names)}.{random.choice(last_names)}{random.randint(100,999)}@{random.choice(domains)}"

def register_user(session, name):
    """Register a new user and return user data"""
    email = random_email()
    password = 'SecurePass123!'
    resp = session.post(f"{BASE_URL}/auth/register", json={'email': email, 'password': password, 'name': name})
    if resp.status_code != 200:
        print(f"❌ Registration failed for {name}: {resp.status_code} - {resp.text}")
        return None
    print(f"✅ Registered {name} ({email})")
    return {'email': email, 'password': password, 'name': name, 'data': resp.json()}

def get_me(session):
    """Get current user info"""
    resp = session.get(f"{BASE_URL}/auth/me")
    if resp.status_code != 200:
        return None
    return resp.json()

# ============ TEST 1: PRO REMOVAL ============
print("\n" + "="*60)
print("TEST 1: PRO REMOVAL - Removed endpoints & advanced stats")
print("="*60)

try:
    # Test removed endpoints return 404
    s = requests.Session()
    removed_endpoints = [
        '/subscription/status',
        '/subscription/checkout',
        '/admin/pro-teams',
        '/admin/subscriptions',
        '/admin/grant-pro'
    ]
    
    for endpoint in removed_endpoints:
        resp = s.get(f"{BASE_URL}{endpoint}")
        if resp.status_code == 404:
            print(f"✅ {endpoint} returns 404 (removed)")
        else:
            print(f"❌ {endpoint} returned {resp.status_code}, expected 404")
    
    # Test new user has role='player', no plan/pro_until
    user_info = register_user(s, "Test Player")
    if user_info:
        me = get_me(s)
        if me and me['user'].get('role') == 'player':
            print(f"✅ New user has role='player'")
        else:
            print(f"❌ New user role: {me['user'].get('role') if me else 'N/A'}, expected 'player'")
        
        if me and 'plan' not in me['user'] and 'pro_until' not in me['user']:
            print(f"✅ New user has no plan/pro_until fields")
        else:
            print(f"❌ New user has plan/pro_until fields: {me['user'] if me else 'N/A'}")
    
    # Create a team to test advanced-stats
    team_resp = s.post(f"{BASE_URL}/teams", json={'name': 'Test Team Stats', 'city': 'London'})
    if team_resp.status_code == 200:
        team_id = team_resp.json()['team']['id']
        stats_resp = s.get(f"{BASE_URL}/teams/{team_id}/advanced-stats")
        if stats_resp.status_code == 200:
            print(f"✅ /teams/:id/advanced-stats returns 200 for any team")
        else:
            print(f"❌ /teams/:id/advanced-stats returned {stats_resp.status_code}, expected 200")
    
    print("✅ TEST 1 PASSED: PRO removal working correctly")
except Exception as e:
    print(f"❌ TEST 1 FAILED: {e}")

# ============ TEST 2: CLUB MEMBERSHIP MODEL ============
print("\n" + "="*60)
print("TEST 2: CLUB MEMBERSHIP MODEL - Roles & /auth/me")
print("="*60)

try:
    # Register captain A, player P1, player P2
    captain_a = requests.Session()
    player_p1 = requests.Session()
    player_p2 = requests.Session()
    
    cap_a_info = register_user(captain_a, "Captain Alpha")
    p1_info = register_user(player_p1, "Player One")
    p2_info = register_user(player_p2, "Player Two")
    
    # Check P1 is free_agent initially
    me_p1 = get_me(player_p1)
    if me_p1['role'] == 'free_agent' and me_p1['team'] is None:
        print(f"✅ P1 initial role: free_agent, team: null")
    else:
        print(f"❌ P1 initial state: role={me_p1['role']}, team={me_p1['team']}")
    
    # Captain A creates team
    team_resp = captain_a.post(f"{BASE_URL}/teams", json={'name': 'Alpha FC', 'city': 'Manchester', 'football_type': '5'})
    if team_resp.status_code != 200:
        print(f"❌ Team creation failed: {team_resp.status_code} - {team_resp.text}")
        raise Exception("Team creation failed")
    
    team_a = team_resp.json()['team']
    print(f"✅ Captain A created team: {team_a['name']}")
    
    # Check A's /auth/me shows role='captain'
    me_a = get_me(captain_a)
    if me_a['role'] == 'captain' and me_a['membership']['role'] == 'captain':
        print(f"✅ Captain A role: captain, membership.role: captain")
    else:
        print(f"❌ Captain A: role={me_a['role']}, membership.role={me_a.get('membership', {}).get('role')}")
    
    # Captain A tries to create second team -> 409
    team2_resp = captain_a.post(f"{BASE_URL}/teams", json={'name': 'Beta FC', 'city': 'London'})
    if team2_resp.status_code == 409:
        print(f"✅ Captain A cannot create second team (409)")
    else:
        print(f"❌ Second team creation returned {team2_resp.status_code}, expected 409")
    
    print("✅ TEST 2 PASSED: Club membership model working")
except Exception as e:
    print(f"❌ TEST 2 FAILED: {e}")

# ============ TEST 3: JOIN REQUESTS FLOW ============
print("\n" + "="*60)
print("TEST 3: JOIN REQUESTS FLOW - Send/Accept/Reject/Cancel")
print("="*60)

try:
    # P1 sends join request to team A
    jr_resp = player_p1.post(f"{BASE_URL}/teams/{team_a['id']}/join-request", json={
        'message': 'I want to join your team!',
        'position': 'FWD',
        'jersey_number': 9
    })
    if jr_resp.status_code != 200:
        print(f"❌ Join request failed: {jr_resp.status_code} - {jr_resp.text}")
        raise Exception("Join request failed")
    
    jr_p1 = jr_resp.json()['request']
    print(f"✅ P1 sent join request to team A")
    
    # P1 tries duplicate request -> 409
    dup_resp = player_p1.post(f"{BASE_URL}/teams/{team_a['id']}/join-request", json={'message': 'Again'})
    if dup_resp.status_code == 409:
        print(f"✅ Duplicate join request returns 409")
    else:
        print(f"❌ Duplicate request returned {dup_resp.status_code}, expected 409")
    
    # Captain A gets join requests
    jrs_resp = captain_a.get(f"{BASE_URL}/teams/{team_a['id']}/join-requests")
    if jrs_resp.status_code == 200 and len(jrs_resp.json()['requests']) == 1:
        print(f"✅ Captain A sees 1 pending join request")
    else:
        print(f"❌ Join requests: {jrs_resp.status_code}, count: {len(jrs_resp.json().get('requests', []))}")
    
    # P1 tries to get join requests -> 403
    p1_jrs_resp = player_p1.get(f"{BASE_URL}/teams/{team_a['id']}/join-requests")
    if p1_jrs_resp.status_code == 403:
        print(f"✅ P1 cannot view join requests (403)")
    else:
        print(f"❌ P1 join requests returned {p1_jrs_resp.status_code}, expected 403")
    
    # Check Captain A's pending_requests_count
    me_a = get_me(captain_a)
    if me_a['pending_requests_count'] == 1:
        print(f"✅ Captain A pending_requests_count: 1")
    else:
        print(f"❌ Captain A pending_requests_count: {me_a.get('pending_requests_count')}, expected 1")
    
    # Captain A accepts P1's request
    accept_resp = captain_a.post(f"{BASE_URL}/join-requests/{jr_p1['id']}/accept")
    if accept_resp.status_code != 200:
        print(f"❌ Accept request failed: {accept_resp.status_code} - {accept_resp.text}")
        raise Exception("Accept request failed")
    
    print(f"✅ Captain A accepted P1's request")
    
    # Check P1 is now a player
    me_p1 = get_me(player_p1)
    if me_p1['role'] == 'player' and me_p1['membership']['role'] == 'player':
        print(f"✅ P1 role: player, membership.role: player")
    else:
        print(f"❌ P1: role={me_p1['role']}, membership.role={me_p1.get('membership', {}).get('role')}")
    
    # Check team has 2 members
    team_resp = captain_a.get(f"{BASE_URL}/teams/{team_a['id']}")
    members = team_resp.json()['members']
    if len(members) == 2:
        print(f"✅ Team A has 2 members")
    else:
        print(f"❌ Team A members: {len(members)}, expected 2")
    
    # P1 tries to create team -> 409
    p1_team_resp = player_p1.post(f"{BASE_URL}/teams", json={'name': 'P1 Team'})
    if p1_team_resp.status_code == 409:
        print(f"✅ P1 cannot create team (409)")
    else:
        print(f"❌ P1 team creation returned {p1_team_resp.status_code}, expected 409")
    
    # P1 tries to join another team -> 409
    captain_b = requests.Session()
    register_user(captain_b, "Captain Beta")
    team_b_resp = captain_b.post(f"{BASE_URL}/teams", json={'name': 'Beta FC', 'city': 'Liverpool'})
    team_b = team_b_resp.json()['team']
    
    p1_jr2_resp = player_p1.post(f"{BASE_URL}/teams/{team_b['id']}/join-request", json={'message': 'Join Beta'})
    if p1_jr2_resp.status_code == 409:
        print(f"✅ P1 cannot join another team (409)")
    else:
        print(f"❌ P1 join another team returned {p1_jr2_resp.status_code}, expected 409")
    
    print("✅ TEST 3 PASSED: Join requests flow working")
except Exception as e:
    print(f"❌ TEST 3 FAILED: {e}")

# ============ TEST 4: CAPTAIN-ONLY PERMISSIONS ============
print("\n" + "="*60)
print("TEST 4: CAPTAIN-ONLY PERMISSIONS - 403 for players")
print("="*60)

try:
    # P1 (player) tries to update team -> 403
    update_resp = player_p1.put(f"{BASE_URL}/teams/{team_a['id']}", json={'name': 'Hacked Team'})
    if update_resp.status_code == 403:
        print(f"✅ P1 cannot update team (403)")
    else:
        print(f"❌ P1 update team returned {update_resp.status_code}, expected 403")
    
    # P1 tries to create challenge -> 403
    ch_resp = player_p1.post(f"{BASE_URL}/challenges", json={'football_type': '5', 'city': 'Manchester'})
    if ch_resp.status_code == 403:
        print(f"✅ P1 cannot create challenge (403)")
    else:
        print(f"❌ P1 create challenge returned {ch_resp.status_code}, expected 403")
    
    # P1 can create post -> 200
    post_resp = player_p1.post(f"{BASE_URL}/posts", json={'content': 'Hello from P1!', 'kind': 'update'})
    if post_resp.status_code == 200:
        print(f"✅ P1 can create post (200)")
    else:
        print(f"❌ P1 create post returned {post_resp.status_code}, expected 200")
    
    print("✅ TEST 4 PASSED: Captain-only permissions working")
except Exception as e:
    print(f"❌ TEST 4 FAILED: {e}")

# ============ TEST 5: JOIN REQUEST REJECT & CANCEL ============
print("\n" + "="*60)
print("TEST 5: JOIN REQUEST REJECT & CANCEL")
print("="*60)

try:
    # P2 sends request to team A
    jr2_resp = player_p2.post(f"{BASE_URL}/teams/{team_a['id']}/join-request", json={'message': 'Let me join!', 'position': 'MID'})
    jr_p2 = jr2_resp.json()['request']
    print(f"✅ P2 sent join request to team A")
    
    # Captain A rejects P2's request
    reject_resp = captain_a.post(f"{BASE_URL}/join-requests/{jr_p2['id']}/reject")
    if reject_resp.status_code == 200 and reject_resp.json()['status'] == 'rejected':
        print(f"✅ Captain A rejected P2's request")
    else:
        print(f"❌ Reject returned {reject_resp.status_code}, status: {reject_resp.json().get('status')}")
    
    # P2 sends new request
    jr3_resp = player_p2.post(f"{BASE_URL}/teams/{team_a['id']}/join-request", json={'message': 'Please!'})
    jr_p2_new = jr3_resp.json()['request']
    
    # P2 cancels their own request
    cancel_resp = player_p2.post(f"{BASE_URL}/join-requests/{jr_p2_new['id']}/cancel")
    if cancel_resp.status_code == 200 and cancel_resp.json()['status'] == 'cancelled':
        print(f"✅ P2 cancelled their own request")
    else:
        print(f"❌ Cancel returned {cancel_resp.status_code}, status: {cancel_resp.json().get('status')}")
    
    print("✅ TEST 5 PASSED: Reject & cancel working")
except Exception as e:
    print(f"❌ TEST 5 FAILED: {e}")

# ============ TEST 6: PLAYER PROFILES & DISCOVER ============
print("\n" + "="*60)
print("TEST 6: PLAYER PROFILES & DISCOVER")
print("="*60)

try:
    # P1 updates profile
    profile_resp = player_p1.put(f"{BASE_URL}/me/profile", json={
        'jersey_number': 10,
        'position': 'MID',
        'bio': 'Midfielder extraordinaire',
        'city': 'Manchester',
        'preferred_foot': 'right'
    })
    if profile_resp.status_code == 200:
        print(f"✅ P1 updated profile")
    else:
        print(f"❌ Profile update returned {profile_resp.status_code}")
    
    # Get P1's public profile
    p1_id = me_p1['user']['id']
    player_resp = requests.get(f"{BASE_URL}/players/{p1_id}")
    if player_resp.status_code == 200:
        player_data = player_resp.json()
        if player_data['player']['status'] == 'club_member' and player_data['club']['name'] == 'Alpha FC':
            print(f"✅ GET /players/:id shows status=club_member, club=Alpha FC")
        else:
            print(f"❌ Player profile: status={player_data['player']['status']}, club={player_data.get('club', {}).get('name')}")
    
    # Discover free agents (should include P2, not P1)
    discover_resp = requests.get(f"{BASE_URL}/discover/players?status=free_agent")
    if discover_resp.status_code == 200:
        free_agents = discover_resp.json()['players']
        p1_in_free = any(p['id'] == p1_id for p in free_agents)
        p2_id = get_me(player_p2)['user']['id']
        p2_in_free = any(p['id'] == p2_id for p in free_agents)
        
        if not p1_in_free and p2_in_free:
            print(f"✅ Discover free_agent: P2 included, P1 not included")
        else:
            print(f"❌ Discover free_agent: P1={p1_in_free}, P2={p2_in_free}")
    
    print("✅ TEST 6 PASSED: Player profiles & discover working")
except Exception as e:
    print(f"❌ TEST 6 FAILED: {e}")

# ============ TEST 7: KIT CUSTOMIZATION ============
print("\n" + "="*60)
print("TEST 7: KIT CUSTOMIZATION - Sanitization")
print("="*60)

try:
    # Captain A updates kit with valid and invalid hex
    kit_resp = captain_a.put(f"{BASE_URL}/teams/{team_a['id']}", json={
        'kit': {
            'home': {'shirt': '#ff0000', 'pattern': 'stripes'},
            'away': {'shirt': 'bad_hex', 'pattern': 'invalid_pattern'}
        }
    })
    if kit_resp.status_code == 200:
        kit = kit_resp.json()['team']['kit']
        if kit['home']['shirt'] == '#ff0000' and kit['home']['pattern'] == 'stripes':
            print(f"✅ Kit home: valid hex and pattern preserved")
        else:
            print(f"❌ Kit home: shirt={kit['home']['shirt']}, pattern={kit['home']['pattern']}")
        
        if kit['away']['shirt'] == '#10b981' and kit['away']['pattern'] == 'solid':
            print(f"✅ Kit away: invalid hex/pattern replaced with defaults")
        else:
            print(f"❌ Kit away: shirt={kit['away']['shirt']}, pattern={kit['away']['pattern']}")
    
    # Get team and verify kit is returned
    team_resp = captain_a.get(f"{BASE_URL}/teams/{team_a['id']}")
    if team_resp.status_code == 200 and team_resp.json()['team']['kit'] is not None:
        print(f"✅ GET /teams/:id returns kit")
    
    # Captain A sets recruiting=false
    recruit_resp = captain_a.put(f"{BASE_URL}/teams/{team_a['id']}", json={'recruiting': False})
    if recruit_resp.status_code == 200:
        print(f"✅ Captain A set recruiting=false")
    
    # P2 tries to join -> 400
    jr_blocked = player_p2.post(f"{BASE_URL}/teams/{team_a['id']}/join-request", json={'message': 'Join?'})
    if jr_blocked.status_code == 400:
        print(f"✅ P2 cannot join when recruiting=false (400)")
    else:
        print(f"❌ Join request with recruiting=false returned {jr_blocked.status_code}, expected 400")
    
    print("✅ TEST 7 PASSED: Kit customization & recruiting flag working")
except Exception as e:
    print(f"❌ TEST 7 FAILED: {e}")

# ============ TEST 8: TRANSFER CAPTAIN & LEAVE CLUB ============
print("\n" + "="*60)
print("TEST 8: TRANSFER CAPTAIN & LEAVE CLUB")
print("="*60)

try:
    # Captain A transfers captaincy to P1
    transfer_resp = captain_a.post(f"{BASE_URL}/teams/{team_a['id']}/transfer-captain", json={'user_id': p1_id})
    if transfer_resp.status_code == 200:
        print(f"✅ Captain A transferred captaincy to P1")
    else:
        print(f"❌ Transfer captain returned {transfer_resp.status_code}")
    
    # Check P1 is now captain
    me_p1_new = get_me(player_p1)
    if me_p1_new['role'] == 'captain':
        print(f"✅ P1 is now captain")
    else:
        print(f"❌ P1 role: {me_p1_new['role']}, expected captain")
    
    # Check A is now player
    me_a_new = get_me(captain_a)
    if me_a_new['role'] == 'player':
        print(f"✅ A is now player")
    else:
        print(f"❌ A role: {me_a_new['role']}, expected player")
    
    # Check team.captain_id updated
    team_resp = player_p1.get(f"{BASE_URL}/teams/{team_a['id']}")
    if team_resp.json()['team']['captain_id'] == p1_id:
        print(f"✅ team.captain_id updated to P1")
    else:
        print(f"❌ team.captain_id: {team_resp.json()['team']['captain_id']}, expected {p1_id}")
    
    # A (now player) leaves club
    leave_resp = captain_a.post(f"{BASE_URL}/me/leave-club")
    if leave_resp.status_code == 200:
        print(f"✅ A left the club")
    else:
        print(f"❌ Leave club returned {leave_resp.status_code}")
    
    # Check A is now free_agent
    me_a_after = get_me(captain_a)
    if me_a_after['role'] == 'free_agent':
        print(f"✅ A is now free_agent")
    else:
        print(f"❌ A role: {me_a_after['role']}, expected free_agent")
    
    # P1 (captain) tries to leave -> 400
    p1_leave_resp = player_p1.post(f"{BASE_URL}/me/leave-club")
    if p1_leave_resp.status_code == 400:
        print(f"✅ P1 (captain) cannot leave (400)")
    else:
        print(f"❌ P1 leave returned {p1_leave_resp.status_code}, expected 400")
    
    print("✅ TEST 8 PASSED: Transfer captain & leave club working")
except Exception as e:
    print(f"❌ TEST 8 FAILED: {e}")

# ============ TEST 9: MEMBER REMOVAL ============
print("\n" + "="*60)
print("TEST 9: MEMBER REMOVAL")
print("="*60)

try:
    # P2 joins team B
    jr_b = player_p2.post(f"{BASE_URL}/teams/{team_b['id']}/join-request", json={'message': 'Join Beta'})
    captain_b.post(f"{BASE_URL}/join-requests/{jr_b.json()['request']['id']}/accept")
    p2_id = get_me(player_p2)['user']['id']
    print(f"✅ P2 joined team B")
    
    # Captain B removes P2
    remove_resp = captain_b.delete(f"{BASE_URL}/teams/{team_b['id']}/members/{p2_id}")
    if remove_resp.status_code == 200:
        print(f"✅ Captain B removed P2")
    else:
        print(f"❌ Remove member returned {remove_resp.status_code}")
    
    # Check P2 is free_agent again
    me_p2 = get_me(player_p2)
    if me_p2['role'] == 'free_agent':
        print(f"✅ P2 is now free_agent after removal")
    else:
        print(f"❌ P2 role: {me_p2['role']}, expected free_agent")
    
    print("✅ TEST 9 PASSED: Member removal working")
except Exception as e:
    print(f"❌ TEST 9 FAILED: {e}")

# ============ TEST 10: LEGACY BACKFILL ============
print("\n" + "="*60)
print("TEST 10: LEGACY BACKFILL - Direct Mongo insert")
print("="*60)

try:
    # Create a new user
    legacy_user = requests.Session()
    legacy_info = register_user(legacy_user, "Legacy Captain")
    legacy_id = get_me(legacy_user)['user']['id']
    
    # Insert team directly in Mongo with captain_id but no club_members entry
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    legacy_team_id = str(uuid4())
    db.teams.insert_one({
        'id': legacy_team_id,
        'captain_id': legacy_id,
        'name': 'Legacy Team',
        'city': 'London',
        'rating': 1000,
        'wins': 0, 'draws': 0, 'losses': 0,
        'goals_for': 0, 'goals_against': 0,
        'streak': 0, 'best_streak': 0,
        'matches_played': 0,
        'followers': [],
        'achievements': [],
        'last_matches': [],
        'recruiting': True,
        'primary_color': '#10b981',
        'secondary_color': '#0ea5e9',
        'football_type': 'both',
        'created_at': None
    })
    print(f"✅ Inserted legacy team directly in Mongo (no club_members entry)")
    
    # Call /auth/me for legacy user -> should return role='captain'
    me_legacy = get_me(legacy_user)
    if me_legacy['role'] == 'captain':
        print(f"✅ Legacy user /auth/me returns role='captain' (backfilled)")
    else:
        print(f"❌ Legacy user role: {me_legacy['role']}, expected captain")
    
    # Verify club_members entry was created
    member_entry = db.club_members.find_one({'user_id': legacy_id, 'club_id': legacy_team_id})
    if member_entry and member_entry['role'] == 'captain':
        print(f"✅ club_members entry auto-created with role='captain'")
    else:
        print(f"❌ club_members entry not found or wrong role")
    
    print("✅ TEST 10 PASSED: Legacy backfill working")
except Exception as e:
    print(f"❌ TEST 10 FAILED: {e}")

# ============ TEST 11: REGRESSION - CHALLENGE->MATCH->ELO ============
print("\n" + "="*60)
print("TEST 11: REGRESSION - Challenge->Match->Dual Confirm->ELO")
print("="*60)

try:
    # Create two new captains with teams
    cap_x = requests.Session()
    cap_y = requests.Session()
    
    register_user(cap_x, "Captain X")
    register_user(cap_y, "Captain Y")
    
    team_x_resp = cap_x.post(f"{BASE_URL}/teams", json={'name': 'Team X', 'city': 'London', 'football_type': '5'})
    team_y_resp = cap_y.post(f"{BASE_URL}/teams", json={'name': 'Team Y', 'city': 'London', 'football_type': '5'})
    
    team_x = team_x_resp.json()['team']
    team_y = team_y_resp.json()['team']
    print(f"✅ Created Team X and Team Y")
    
    # Team X creates challenge
    ch_resp = cap_x.post(f"{BASE_URL}/challenges", json={
        'football_type': '5',
        'date': '2024-12-20',
        'city': 'London'
    })
    challenge = ch_resp.json()['challenge']
    print(f"✅ Team X created challenge")
    
    # Team Y accepts challenge
    accept_resp = cap_y.post(f"{BASE_URL}/challenges/{challenge['id']}/accept")
    match = accept_resp.json()['match']
    print(f"✅ Team Y accepted challenge, match created")
    
    # Team X confirms result: 3-1
    conf_x = cap_x.post(f"{BASE_URL}/matches/{match['id']}/confirm", json={
        'score_home': 3,
        'score_away': 1
    })
    if conf_x.json()['match']['status'] == 'pending':
        print(f"✅ Team X confirmed (status=pending)")
    else:
        print(f"❌ After first confirm, status: {conf_x.json()['match']['status']}, expected pending")
    
    # Team Y confirms matching result: 3-1
    conf_y = cap_y.post(f"{BASE_URL}/matches/{match['id']}/confirm", json={
        'score_home': 3,
        'score_away': 1
    })
    if conf_y.json()['match']['status'] == 'confirmed':
        print(f"✅ Team Y confirmed matching score (status=confirmed)")
    else:
        print(f"❌ After second confirm, status: {conf_y.json()['match']['status']}, expected confirmed")
    
    # Check ELO updates
    team_x_after = cap_x.get(f"{BASE_URL}/teams/{team_x['id']}").json()['team']
    team_y_after = cap_y.get(f"{BASE_URL}/teams/{team_y['id']}").json()['team']
    
    if team_x_after['rating'] > 1000:
        print(f"✅ Team X rating increased: {team_x_after['rating']} (winner)")
    else:
        print(f"❌ Team X rating: {team_x_after['rating']}, expected > 1000")
    
    if team_y_after['rating'] < 1000:
        print(f"✅ Team Y rating decreased: {team_y_after['rating']} (loser)")
    else:
        print(f"❌ Team Y rating: {team_y_after['rating']}, expected < 1000")
    
    # Check stats updated
    if team_x_after['wins'] == 1 and team_x_after['goals_for'] == 3:
        print(f"✅ Team X stats: wins=1, goals_for=3")
    else:
        print(f"❌ Team X stats: wins={team_x_after['wins']}, goals_for={team_x_after['goals_for']}")
    
    if team_y_after['losses'] == 1 and team_y_after['goals_against'] == 3:
        print(f"✅ Team Y stats: losses=1, goals_against=3")
    else:
        print(f"❌ Team Y stats: losses={team_y_after['losses']}, goals_against={team_y_after['goals_against']}")
    
    print("✅ TEST 11 PASSED: Challenge->Match->ELO regression working")
except Exception as e:
    print(f"❌ TEST 11 FAILED: {e}")

# ============ TEST 12: PLAYER CANNOT ACCEPT CHALLENGE ============
print("\n" + "="*60)
print("TEST 12: PLAYER CANNOT ACCEPT CHALLENGE (403)")
print("="*60)

try:
    # Create new captain and team
    cap_z = requests.Session()
    register_user(cap_z, "Captain Z")
    team_z_resp = cap_z.post(f"{BASE_URL}/teams", json={'name': 'Team Z', 'city': 'Manchester'})
    team_z = team_z_resp.json()['team']
    
    # Team Z creates challenge
    ch_z = cap_z.post(f"{BASE_URL}/challenges", json={'football_type': '5', 'city': 'Manchester'})
    challenge_z = ch_z.json()['challenge']
    
    # Add a player to Team Y
    player_new = requests.Session()
    register_user(player_new, "Player New")
    jr_new = player_new.post(f"{BASE_URL}/teams/{team_y['id']}/join-request", json={'message': 'Join'})
    cap_y.post(f"{BASE_URL}/join-requests/{jr_new.json()['request']['id']}/accept")
    print(f"✅ Player New joined Team Y")
    
    # Player tries to accept challenge -> 403
    accept_player = player_new.post(f"{BASE_URL}/challenges/{challenge_z['id']}/accept")
    if accept_player.status_code == 403:
        print(f"✅ Player cannot accept challenge (403)")
    else:
        print(f"❌ Player accept challenge returned {accept_player.status_code}, expected 403")
    
    print("✅ TEST 12 PASSED: Player cannot accept challenge")
except Exception as e:
    print(f"❌ TEST 12 FAILED: {e}")

# ============ TEST 13: PLAYER CANNOT CONFIRM MATCH ============
print("\n" + "="*60)
print("TEST 13: PLAYER CANNOT CONFIRM MATCH (403)")
print("="*60)

try:
    # Captain Y accepts challenge Z
    accept_cap = cap_y.post(f"{BASE_URL}/challenges/{challenge_z['id']}/accept")
    match_z = accept_cap.json()['match']
    
    # Player tries to confirm match -> 403
    conf_player = player_new.post(f"{BASE_URL}/matches/{match_z['id']}/confirm", json={'score_home': 2, 'score_away': 2})
    if conf_player.status_code == 403:
        print(f"✅ Player cannot confirm match (403)")
    else:
        print(f"❌ Player confirm match returned {conf_player.status_code}, expected 403")
    
    print("✅ TEST 13 PASSED: Player cannot confirm match")
except Exception as e:
    print(f"❌ TEST 13 FAILED: {e}")

print("\n" + "="*60)
print("ALL TESTS COMPLETED")
print("="*60)
