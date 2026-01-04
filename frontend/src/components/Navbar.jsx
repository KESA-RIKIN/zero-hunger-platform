import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Heart, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { currentUser, logout } = useAuth();

    return (
        <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2">
                        <div className="bg-emerald-600 p-2 rounded-lg">
                            <Heart className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            ZeroHunger
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link to="/" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">Home</Link>
                        <Link to="/donate" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">Donate</Link>
                        <Link to="/receive" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">Find Food</Link>
                        <Link to="/coordinator" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">Coordinator</Link>
                        <Link to="/about" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">About</Link>
                    </div>

                    {/* Auth Buttons */}
                    <div className="hidden md:flex items-center space-x-4">
                        {!currentUser ? (
                            <>
                                <Link to="/login" className="text-gray-600 hover:text-emerald-600 font-medium">Log in</Link>
                                <Link to="/signup" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full font-medium transition-all shadow-lg shadow-emerald-200">
                                    Sign up
                                </Link>
                            </>
                        ) : (
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center h-10 w-10 text-emerald-600 bg-emerald-50 rounded-full border border-emerald-100 cursor-default font-bold text-lg" title="Logged In">
                                    {currentUser.email?.charAt(0).toUpperCase()}
                                </div>
                                <button
                                    onClick={() => logout()}
                                    className="text-gray-500 hover:text-red-500 text-sm font-medium transition-colors border-l border-gray-200 pl-4"
                                >
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600 hover:text-emerald-600 focus:outline-none">
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 absolute w-full">
                    <div className="px-4 pt-2 pb-6 space-y-2">
                        <Link to="/" className="block py-2 text-gray-600 font-medium" onClick={() => setIsOpen(false)}>Home</Link>
                        <Link to="/donate" className="block py-2 text-gray-600 font-medium" onClick={() => setIsOpen(false)}>Donate</Link>
                        <Link to="/receive" className="block py-2 text-gray-600 font-medium" onClick={() => setIsOpen(false)}>Find Food</Link>
                        <Link to="/coordinator" className="block py-2 text-gray-600 font-medium" onClick={() => setIsOpen(false)}>Coordinator</Link>
                        <Link to="/about" className="block py-2 text-gray-600 font-medium" onClick={() => setIsOpen(false)}>About</Link>
                        <div className="pt-4 border-t border-gray-100 flex flex-col space-y-3">
                            {!currentUser ? (
                                <>
                                    <Link to="/login" className="text-center py-2 text-gray-600 font-medium" onClick={() => setIsOpen(false)}>Log in</Link>
                                    <Link to="/signup" className="text-center py-2 bg-emerald-600 text-white rounded-lg font-medium" onClick={() => setIsOpen(false)}>Sign up</Link>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center justify-center py-3 text-emerald-600 bg-emerald-50 rounded-lg font-medium cursor-default">
                                        <User className="h-6 w-6 mr-2" />
                                        Profile Active
                                    </div>
                                    <button
                                        onClick={() => { logout(); setIsOpen(false); }}
                                        className="text-center py-2 text-red-500 font-medium border border-red-100 rounded-lg"
                                    >
                                        Log out
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
