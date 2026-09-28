import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getDatabase, get, ref, set } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';
const app=getApps().length?getApp():initializeApp(firebaseConfig), auth=getAuth(app), database=getDatabase(app);
const fragment=new URLSearchParams(location.hash.slice(1)), request=fragment.get('request'), secret=fragment.get('key');
history.replaceState(null,'',location.pathname); // Secret is never a query string or sent in a Referer.
const $=id=>document.getElementById(id), status=message=>$('connectStatus').textContent=message;
const valid=/^[a-f0-9]{64}$/.test(request||'')&&/^[A-Za-z0-9_-]{43}$/.test(secret||'');
let approved=false;
if(!valid)status('Open BancyCraft and click Connect to Bancy.gg to start a valid connection.');
else onAuthStateChanged(auth,async user=>{
  if(approved)return;
  $('connectLogin').hidden=!!user;$('connectApproval').hidden=!user;
  if(user){const profile=await get(ref(database,'publicProfiles/'+user.uid)).catch(()=>null);$('connectIdentity').textContent='Continue as '+(profile?.val()?.displayName||user.displayName||'Nexus User');status('You are signed into Bancy.gg. Approve the connection below.');}
  else status('Sign into Bancy.gg, then approve the desktop connection.');
});
$('connectSignIn').addEventListener('click',async()=>{if(!valid)return;try{$('connectSignIn').disabled=true;await signInWithEmailAndPassword(auth,$('connectEmail').value.trim(),$('connectPassword').value);$('connectPassword').value='';}catch{status('Sign-in failed. Check your email and password, then try again.');}finally{$('connectSignIn').disabled=false;}});
$('connectSwitch').addEventListener('click',()=>signOut(auth));
$('connectAuthorize').addEventListener('click',async()=>{
  if(!valid||!auth.currentUser||approved)return;
  $('connectAuthorize').disabled=true;
  try {
    const user=auth.currentUser,idToken=await user.getIdToken(true);
    const key=await crypto.subtle.importKey('raw',Uint8Array.from(atob(secret.replace(/-/g,'+').replace(/_/g,'/')+'='),c=>c.charCodeAt(0)),{name:'AES-GCM'},false,['encrypt']);
    const iv=crypto.getRandomValues(new Uint8Array(12)),text=new TextEncoder();
    const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:text.encode(request)},key,text.encode(JSON.stringify({request,uid:user.uid,idToken,refreshToken:user.refreshToken})));
    const encode=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    await set(ref(database,'bancycraftHandoffs/'+request),{uid:user.uid,iv:encode(iv),ciphertext:encode(encrypted),expiresAt:Date.now()+300000});
    approved=true;$('connectApproval').hidden=true;status('Connection approved. Return to BancyCraft; you can close this tab.');
  }catch{status('The connection could not be approved. Start a new connection in BancyCraft and try again.');$('connectAuthorize').disabled=false;}
});
