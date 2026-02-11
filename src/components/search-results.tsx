
'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Loader2, Newspaper, User } from 'lucide-react';

type SearchResultState = {
    users: any[];
    posts: any[];
}

type SearchResultsProps = {
    results: SearchResultState;
    isLoading: boolean;
    onClose: () => void;
}

export function SearchResults({ results, isLoading, onClose }: SearchResultsProps) {

  const handleLinkClick = () => {
    onClose();
  };

  return (
    <Card className="absolute top-full mt-2 w-[300px] lg:w-[400px] shadow-lg z-50">
      <CardContent className="p-2 max-h-[400px] overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center items-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {!isLoading && results.users.length === 0 && results.posts.length === 0 && (
          <p className="text-center text-muted-foreground p-4">No results found.</p>
        )}
        {!isLoading && results.users.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold p-2 flex items-center gap-2"><User className="h-4 w-4" /> People</h3>
            <ul>
              {results.users.map((user) => (
                <li key={user.id}>
                  <Link href={`/profile?uid=${user.uid}`} onClick={handleLinkClick}>
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person" />
                            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!isLoading && results.posts.length > 0 && (
          <div className="mt-2">
            <h3 className="text-sm font-semibold p-2 flex items-center gap-2"><Newspaper className="h-4 w-4" /> Posts</h3>
             <ul>
              {results.posts.map((post) => (
                <li key={post.id}>
                  <Link href={`/#post-${post.id}`} onClick={handleLinkClick}>
                    <div className="p-2 rounded-md hover:bg-muted">
                        <p className="text-sm font-medium truncate">{post.content}</p>
                        <p className="text-xs text-muted-foreground">by {post.user.name}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
