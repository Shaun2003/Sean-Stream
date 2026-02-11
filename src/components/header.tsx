
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Home,
  Users,
  MessageSquare,
  Search,
  Bell,
  User,
  LogOut,
  Heart,
  UserPlus,
  Loader2,
  Menu,
} from 'lucide-react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

import { cn } from '@/lib/utils';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from './logo';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { type Notification, markNotificationsAsRead } from '@/app/notifications/actions';
import { searchEverything } from '@/app/actions';
import { SearchResults } from './search-results';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/friends', icon: Users, label: 'Friends' },
  { href: '/messages', icon: MessageSquare, label: 'Messages' },
];

type SearchResultState = {
    users: any[];
    posts: any[];
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState(auth.currentUser);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultState>({ users: [], posts: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', user.uid)
    );

    const unsubscribeNotifications = onSnapshot(q, (snapshot) => {
      let notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      
      notifs.sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return b.timestamp.seconds - a.timestamp.seconds;
        }
        return 0;
      });

      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    });

    return () => unsubscribeNotifications();
  }, [user]);

  // Debounced search effect
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults({ users: [], posts: [] });
      return;
    }

    setIsSearching(true);
    const debounceTimer = setTimeout(async () => {
      const results = await searchEverything(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 500); // 500ms debounce

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Handle clicking outside of search
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
        setIsMobileSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchRef]);


  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error: any) {
      toast({
        title: 'Logout Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.type === 'FRIEND_REQUEST') {
      router.push('/friends');
    } else if (notification.type === 'NEW_MESSAGE') {
      router.push('/messages');
    } else if (notification.type === 'POST_LIKE' && notification.relatedId) {
      router.push(`/#post-${notification.relatedId}`);
    }
  };

  const handleOpenNotifications = async (open: boolean) => {
    if (open && unreadCount > 0) {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      await markNotificationsAsRead(unreadIds);
    }
  };

  const renderNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'FRIEND_REQUEST': return <UserPlus className="h-5 w-5 text-blue-500" />;
      case 'POST_LIKE': return <Heart className="h-5 w-5 text-red-500" />;
      case 'NEW_MESSAGE': return <MessageSquare className="h-5 w-5 text-green-500" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const showSearchResults = isSearchFocused && searchQuery.length > 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center px-4" ref={searchRef}>
        <div className={cn("flex items-center gap-2", isMobileSearchOpen && "hidden")}>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                 <div className="flex flex-col gap-4 py-4">
                    <Link href="/" className="mb-4">
                      <Logo />
                    </Link>
                    {navItems.map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                        <Button
                            variant="ghost"
                            className={cn(
                            'w-full justify-start gap-2',
                            pathname === item.href && 'bg-accent'
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                        </Button>
                    </Link>
                    ))}
                 </div>
              </SheetContent>
            </Sheet>
            <Link href="/" className="hidden sm:block">
              <Logo />
            </Link>
        </div>


        <div className={cn("hidden md:flex flex-1 justify-center", isMobileSearchOpen && "!flex")}>
          <div className="relative w-full max-w-md md:max-w-none md:w-auto md:ml-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full rounded-full bg-background pl-9 h-9 md:w-[200px] lg:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
            />
             {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
             {showSearchResults && (
                <SearchResults 
                    results={searchResults} 
                    isLoading={isSearching} 
                    onClose={() => {
                        setIsSearchFocused(false);
                        setIsMobileSearchOpen(false);
                    }} 
                />
             )}
          </div>
        </div>

        <nav className="mx-auto hidden md:flex items-center space-x-2">
          {navItems.map((item) => (
             <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                size="lg"
                className={cn(
                  'flex flex-col h-full px-6 text-muted-foreground hover:text-primary hover:bg-transparent',
                  pathname === item.href &&
                    'text-primary border-b-2 border-primary rounded-none'
                )}
              >
                <item.icon className="h-6 w-6" />
              </Button>
            </Link>
          ))}
        </nav>

        <div className={cn("flex items-center space-x-2 ml-auto", isMobileSearchOpen && "hidden")}>
          <Button variant="ghost" size="icon" className="rounded-full md:hidden" onClick={() => setIsMobileSearchOpen(true)}>
            <Search className="h-5 w-5" />
          </Button>

          <DropdownMenu onOpenChange={handleOpenNotifications}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {unreadCount}
                  </Badge>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length > 0 ? (
                notifications.map(notif => (
                  <DropdownMenuItem key={notif.id} onClick={() => handleNotificationClick(notif)} className={cn(!notif.read && "font-bold")}>
                    <div className="flex items-start gap-3 py-2">
                      {renderNotificationIcon(notif.type)}
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{notif.fromUserName}</span>
                          {notif.type === 'FRIEND_REQUEST' && ' sent you a friend request.'}
                          {notif.type === 'POST_LIKE' && ' liked your post.'}
                          {notif.type === 'NEW_MESSAGE' && ' sent you a message.'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notif.timestamp.seconds * 1000), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No new notifications</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL ?? 'https://placehold.co/40x40.png'} alt={user?.displayName ?? 'User'} data-ai-hint="person" />
                  <AvatarFallback>{user?.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
