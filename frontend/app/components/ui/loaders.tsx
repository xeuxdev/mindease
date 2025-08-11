export function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="relative">
        {/* Main loading container */}
        <div className="flex flex-col items-center space-y-6">
          {/* Animated logo/icon area */}
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
              <div className="w-8 h-8 bg-white rounded-lg opacity-90"></div>
            </div>
            {/* Spinning ring */}
            <div className="absolute -inset-2 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          </div>

          {/* Loading text with typing animation */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Mind<span className="text-blue-600">Ease</span>
            </h2>
            <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-300">
              <span className="text-sm font-medium">
                Preparing your experience
              </span>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
          </div>

          {/* Floating particles animation */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-30 animate-bounce top-8 left-4 [animation-delay:0s] [animation-duration:2s]"></div>
            <div className="absolute w-2 h-2 bg-purple-400 rounded-full opacity-30 animate-bounce top-16 right-8 [animation-delay:0.5s] [animation-duration:2.5s]"></div>
            <div className="absolute w-2 h-2 bg-indigo-400 rounded-full opacity-30 animate-bounce bottom-12 left-8 [animation-delay:1s] [animation-duration:3s]"></div>
            <div className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-30 animate-bounce bottom-8 right-4 [animation-delay:1.5s] [animation-duration:2.5s]"></div>
          </div>
        </div>

        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-600/20 blur-3xl -z-10 animate-pulse"></div>
      </div>
    </div>
  );
}

export function LoadingIndicator() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
